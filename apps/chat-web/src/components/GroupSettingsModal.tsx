import React, { useState, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { Group } from '../store/slices/groupsSlice';
import {
  updateGroup,
  createGroupRole,
  updateGroupRole,
  deleteGroupRole,
} from '../store/slices/groupsSlice';

import { IconX } from './Icons';
import { showToast } from './toast';
import { Avatar } from './Avatar';
import { generateImageThumbnail, compressImage } from '../utils/media';
import { hasGroupPermission } from '../utils/permissions';

const AVAILABLE_PERMISSIONS = [
  { value: 'manage_group', label: 'Manage Server' },
  { value: 'manage_channels', label: 'Manage Channels' },
  { value: 'manage_roles', label: 'Manage Roles' },
  { value: 'kick_members', label: 'Kick Members' },
  { value: 'send_messages', label: 'Send Messages' },
  { value: 'attach_files', label: 'Attach Files' },
];

interface GroupSettingsModalProps {
  group: Group;
  onClose: () => void;
}

export const GroupSettingsModal = ({
  group,
  onClose,
}: GroupSettingsModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // Select active group details to get real-time roles
  const activeGroup = useAppSelector((state) =>
    state.groups.groups.find((g) => g.id === group.id),
  );
  const roles = activeGroup?.roles || [];

  const isOwnerOrAdmin =
    activeGroup?.ownerId === user?.id ||
    activeGroup?.members.find((m) => m.userId === user?.id)?.role === 'admin';
  const canManageGroup =
    isOwnerOrAdmin || hasGroupPermission(activeGroup, user?.id, 'manage_group');
  const canManageRoles =
    isOwnerOrAdmin || hasGroupPermission(activeGroup, user?.id, 'manage_roles');

  const [activeTab, setActiveTab] = useState<'overview' | 'roles'>(
    canManageGroup ? 'overview' : 'roles',
  );

  // Overview Tab State
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [avatarUrl, setAvatarUrl] = useState(group.avatarUrl || '');
  const [avatarThumbnailUrl, setAvatarThumbnailUrl] = useState(
    group.avatarThumbnailUrl || '',
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Roles Tab State
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#7289da');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  const deleteOldMedia = async (url: string) => {
    if (!url) {
      return;
    }
    try {
      const bucketUrl = (
        process.env.NEXT_PUBLIC_BUCKET_URL || 'https://bucket.umangsailor.com'
      ).replace(/\/+$/, '');
      const prefix = `${bucketUrl}/storage/`;
      if (url.startsWith(prefix)) {
        const path = url.slice(prefix.length);
        const parts = path.split('/');
        if (parts.length >= 2) {
          const bucket = parts[0];
          const name = parts.slice(1).join('/');
          await fetch(`${bucketUrl}/files`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bucket,
              names: [name],
            }),
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete old media:', err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast.error('Only image files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Image size cannot exceed 5MB.');
      return;
    }

    setUploading(true);

    try {
      if (avatarUrl) {
        await deleteOldMedia(avatarUrl);
      }
      if (avatarThumbnailUrl && avatarThumbnailUrl !== avatarUrl) {
        await deleteOldMedia(avatarThumbnailUrl);
      }

      // Compress main avatar image (max 400px, 0.85 quality)
      const compressedBlob = await compressImage(file, 400, 0.85);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
      });

      // Generate 20% thumbnail
      const thumbBlob = await generateImageThumbnail(file);
      const thumbFile = new File([thumbBlob], `thumb_${file.name}`, {
        type: 'image/jpeg',
      });

      const formData = new FormData();
      formData.append('bucket', 'relayflow');
      formData.append('folder', 'profile-media');
      formData.append('files', compressedFile);
      formData.append('files', thumbFile);

      const bucketUrl = (
        process.env.NEXT_PUBLIC_BUCKET_URL || 'https://bucket.umangsailor.com'
      ).replace(/\/+$/, '');
      const response = await fetch(`${bucketUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        const mainUrl = data.files[0].url;
        const thumbUrl = data.files[1]?.url || mainUrl;
        setAvatarUrl(mainUrl);
        setAvatarThumbnailUrl(thumbUrl);
      } else {
        throw new Error('No files returned');
      }
    } catch (err) {
      console.error('Group avatar upload error:', err);
      showToast.error('Failed to upload icon.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast.error('Please enter a group name.');
      return;
    }
    setIsLoading(true);
    try {
      await dispatch(
        updateGroup({
          groupId: group.id,
          name: name.trim(),
          description: description.trim(),
          avatarUrl,
          avatarThumbnailUrl,
        }),
      ).unwrap();
      showToast.success('Group settings updated!');
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to update group.');
    } finally {
      setIsLoading(false);
    }
  };

  // Roles Tab Actions
  const handleCreateRole = async () => {
    const cleanName = roleName.trim();
    if (!cleanName) {
      return;
    }
    setIsRoleLoading(true);
    try {
      await dispatch(
        createGroupRole({
          groupId: group.id,
          name: cleanName,
          color: roleColor,
          permissions: selectedPermissions,
        }),
      ).unwrap();
      setRoleName('');
      setRoleColor('#7289da');
      setSelectedPermissions([]);
      showToast.success('Role created successfully!');
    } catch (err: any) {
      showToast.error(err || 'Failed to create role.');
    } finally {
      setIsRoleLoading(false);
    }
  };

  const handleStartEdit = (role: any) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleColor(role.color);
    setSelectedPermissions(role.permissions || []);
  };

  const handleUpdateRole = async () => {
    const cleanName = roleName.trim();
    if (!cleanName || !editingRoleId) {
      return;
    }
    setIsRoleLoading(true);
    try {
      await dispatch(
        updateGroupRole({
          groupId: group.id,
          roleId: editingRoleId,
          name: cleanName,
          color: roleColor,
          permissions: selectedPermissions,
        }),
      ).unwrap();
      setEditingRoleId(null);
      setRoleName('');
      setRoleColor('#7289da');
      setSelectedPermissions([]);
      showToast.success('Role updated successfully!');
    } catch (err: any) {
      showToast.error(err || 'Failed to update role.');
    } finally {
      setIsRoleLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this role? This will remove it from all members and private channels.',
      )
    ) {
      return;
    }
    setIsRoleLoading(true);
    try {
      await dispatch(deleteGroupRole({ groupId: group.id, roleId })).unwrap();
      showToast.success('Role deleted successfully!');
      if (editingRoleId === roleId) {
        setEditingRoleId(null);
        setRoleName('');
        setRoleColor('#7289da');
        setSelectedPermissions([]);
      }
    } catch (err: any) {
      showToast.error(err || 'Failed to delete role.');
    } finally {
      setIsRoleLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[rgba(4,6,12,0.65)] backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        className="w-[440px] max-w-full bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[18px] shadow-[var(--glass-shadow)] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-muted)] flex items-center justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-[var(--text-primary)]">
              Group Settings
            </h2>
            <p className="m-1 text-[12.5px] text-[var(--text-muted)]">
              Customize your server settings
            </p>
          </div>
          <button
            id="close-group-settings-modal"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 rounded-md flex items-center active-press"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Tabs */}
        {canManageGroup && canManageRoles && (
          <div className="px-5 border-b border-[var(--border-muted)] flex gap-4 bg-[rgba(0,0,0,0.02)]">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent transition-all cursor-pointer bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] ${
                activeTab === 'overview'
                  ? '!border-[var(--accent-primary)] !text-[var(--accent-primary)]'
                  : ''
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`py-2 px-1 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent transition-all cursor-pointer bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] ${
                activeTab === 'roles'
                  ? '!border-[var(--accent-primary)] !text-[var(--accent-primary)]'
                  : ''
              }`}
            >
              Roles
            </button>
          </div>
        )}

        {/* Body */}
        {activeTab === 'overview' ? (
          <form
            onSubmit={handleSubmit}
            className="px-5 py-5 flex flex-col gap-4"
          >
            {/* Avatar Upload */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.015)] dark:bg-[rgba(255,255,255,0.01)] shadow-sm mb-1 animate-fade-in">
              <div className="relative shrink-0">
                <Avatar
                  letter={name[0]?.toUpperCase() || 'G'}
                  url={avatarUrl}
                  size="lg"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  Group Avatar
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-[8px] text-[11.5px] font-semibold cursor-pointer border-none bg-[var(--theme-btn-active)] text-[var(--theme-btn-active-text)] hover:opacity-95 disabled:opacity-50 active-press"
                  >
                    Upload Image
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteOldMedia(avatarUrl);
                        if (
                          avatarThumbnailUrl &&
                          avatarThumbnailUrl !== avatarUrl
                        ) {
                          deleteOldMedia(avatarThumbnailUrl);
                        }
                        setAvatarUrl('');
                        setAvatarThumbnailUrl('');
                      }}
                      className="px-3 py-1.5 rounded-[8px] text-[11.5px] font-semibold cursor-pointer border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-all active-press"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="group-name-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2"
              >
                Group Name <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                id="group-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Awesome Server"
                maxLength={100}
                required
                className="input-base w-full px-3.5 py-2.5 rounded-[10px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] text-sm box-border focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[2.5px] focus:ring-[var(--accent-ring)]"
              />
            </div>

            <div>
              <label
                htmlFor="group-desc-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2"
              >
                Description
              </label>
              <textarea
                id="group-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description for your group..."
                maxLength={300}
                rows={3}
                className="input-base w-full px-3.5 py-2.5 rounded-[10px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] text-sm box-border resize-none font-sans focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[2.5px] focus:ring-[var(--accent-ring)]"
              />
            </div>
          </form>
        ) : (
          <div className="px-5 py-5 flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
            {/* Create/Edit Form */}
            <div className="p-3.5 rounded-xl border-[1.5px] border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)] flex flex-col gap-3">
              <span className="text-[12px] font-bold text-[var(--text-primary)]">
                {editingRoleId ? 'Edit Role' : 'Create Role'}
              </span>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Staff"
                    maxLength={32}
                    className="input-base w-full px-3 py-2 rounded-[8px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div className="w-[80px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Color
                  </label>
                  <div className="relative flex items-center h-[38px] rounded-[8px] border-[1.5px] border-[var(--glass-border)] bg-[var(--bg-input)] overflow-hidden">
                    <input
                      type="color"
                      value={roleColor}
                      onChange={(e) => setRoleColor(e.target.value)}
                      className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer scale-125"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1 border border-[var(--glass-border)] p-2.5 rounded-lg bg-[var(--bg-input)]">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.value);
                    return (
                      <label
                        key={perm.value}
                        className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions([
                                ...selectedPermissions,
                                perm.value,
                              ]);
                            } else {
                              setSelectedPermissions(
                                selectedPermissions.filter(
                                  (p) => p !== perm.value,
                                ),
                              );
                            }
                          }}
                          className="w-3.5 h-3.5 accent-[var(--accent-primary)] cursor-pointer"
                        />
                        {perm.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2.5 mt-2">
                {editingRoleId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRoleId(null);
                      setRoleName('');
                      setRoleColor('#7289da');
                      setSelectedPermissions([]);
                    }}
                    className="px-3 py-2 rounded-[8px] border-[1.5px] border-[var(--glass-border)] bg-transparent text-[var(--text-secondary)] text-xs font-semibold cursor-pointer active-press"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={editingRoleId ? handleUpdateRole : handleCreateRole}
                  disabled={isRoleLoading || !roleName.trim()}
                  className="btn-send px-4 py-2 rounded-[8px] border-none text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed active-press"
                >
                  {isRoleLoading
                    ? 'Saving...'
                    : editingRoleId
                      ? 'Save Role'
                      : 'Create Role'}
                </button>
              </div>
            </div>

            {/* List of Roles */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
                Roles
              </span>
              {roles.length === 0 ? (
                <p className="m-0 text-xs text-[var(--text-muted)] italic">
                  No roles exist. Create one above to get started.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-2.5 rounded-[10px] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.02)] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                        <span
                          style={{ color: role.color }}
                          className="font-semibold text-sm"
                        >
                          {role.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(role)}
                          className="px-2.5 py-1.5 rounded-[6px] text-[11px] font-bold cursor-pointer border border-[var(--glass-border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.06)] active-press"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role.id)}
                          className="px-2.5 py-1.5 rounded-[6px] text-[11px] font-bold cursor-pointer border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-all active-press"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {activeTab === 'overview' ? (
          <div className="px-5 pb-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-[10px] border-[1.5px] border-[var(--glass-border)] bg-transparent text-[var(--text-secondary)] text-sm font-semibold cursor-pointer active-press"
            >
              Cancel
            </button>
            <button
              id="group-settings-submit-btn"
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !name.trim()}
              className="btn-send px-6 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 active-press"
            >
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="px-5 pb-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-[10px] border-[1.5px] border-[var(--glass-border)] bg-transparent text-[var(--text-secondary)] text-sm font-semibold cursor-pointer active-press"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
