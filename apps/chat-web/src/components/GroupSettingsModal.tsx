import React, { useState, useRef, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import ApiRequest from '../utils/ApiRequest';
import type { Group } from '../store/slices/groupsSlice';
import {
  updateGroup,
  createGroupRole,
  updateGroupRole,
  deleteGroupRole,
  batchUpdateGroupRoles,
} from '../store/slices/groupsSlice';

import { IconX } from './Icons';
import { showToast } from './toast';
import { Avatar } from './Avatar';
import { generateAvatarThumbnail, compressImage } from '../utils/media';
import { hasGroupPermission } from '../utils/permissions';

const AVAILABLE_PERMISSIONS = [
  { value: 'manage_group', label: 'Manage Server' },
  { value: 'manage_channels', label: 'Manage Channels' },
  { value: 'manage_roles', label: 'Manage Roles' },
  { value: 'kick_members', label: 'Kick Members' },
  { value: 'send_messages', label: 'Send Messages' },
  { value: 'attach_files', label: 'Attach Files' },
  { value: 'invite_members', label: 'Invite Others' },
  { value: 'delete_other_messages', label: "Delete Other's Messages" },
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

  const isOwner = activeGroup?.ownerId === user?.id;
  const isOwnerOrAdmin =
    isOwner ||
    activeGroup?.members.find((m) => m.userId === user?.id)?.role === 'admin';
  const canManageGroup =
    isOwnerOrAdmin || hasGroupPermission(activeGroup, user?.id, 'manage_group');
  const canManageRoles =
    isOwnerOrAdmin || hasGroupPermission(activeGroup, user?.id, 'manage_roles');
  const getPermissionsHighestManageRank = (permissions: string[]): number => {
    const perms = new Set<string>(permissions || []);
    if (perms.has('manage_group')) {
      return 1;
    }
    if (perms.has('manage_channels')) {
      return 2;
    }
    if (perms.has('manage_roles')) {
      return 3;
    }
    return 4;
  };

  const currentUserMember = activeGroup?.members.find(
    (m) => m.userId === user?.id,
  );

  const getRequesterRank = (): number => {
    if (isOwner) {
      return 0;
    }
    if (currentUserMember?.role === 'admin') {
      return 1;
    }

    const perms = new Set<string>(currentUserMember?.permissions || []);
    if (
      currentUserMember?.roleIds &&
      currentUserMember.roleIds.length > 0 &&
      activeGroup?.roles
    ) {
      const assignedRoles = activeGroup.roles.filter((role) =>
        currentUserMember.roleIds?.includes(role.id),
      );
      for (const role of assignedRoles) {
        if (role.permissions) {
          role.permissions.forEach((p) => perms.add(p));
        }
      }
    }
    return getPermissionsHighestManageRank(Array.from(perms));
  };

  const requesterRank = getRequesterRank();

  const getMemberHighestRolePriority = (member: any): number => {
    if (!member || !activeGroup) {
      return 1000000;
    }
    if (
      member.role === 'owner' ||
      activeGroup.ownerId === member.userId ||
      member.user?.role === 'admin'
    ) {
      return 0;
    }
    if (member.role === 'admin') {
      return 1;
    }
    const memberRoleIds = member.roleIds || [];
    const groupRoles = activeGroup.roles || [];
    const matchingRoles = groupRoles.filter((r) =>
      memberRoleIds.includes(r.id),
    );
    if (matchingRoles.length === 0) {
      return 1000000;
    }
    return Math.min(
      ...matchingRoles.map((r) =>
        Math.max(r.hierarchyPriority ?? r.priority ?? 1, 1),
      ),
    );
  };

  const reqPriority = getMemberHighestRolePriority(currentUserMember);

  const visiblePermissions = AVAILABLE_PERMISSIONS.filter((perm) => {
    const permRank = getPermissionsHighestManageRank([perm.value]);
    return permRank > requesterRank;
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'roles'>(
    canManageGroup ? 'overview' : 'roles',
  );
  const [rolesSubTab, setRolesSubTab] = useState<
    'manager' | 'hierarchy' | 'color'
  >('manager');

  const sortRolesByColorPriority = (roles: any[]) => {
    return [...roles].sort((a, b) => {
      const cpA = a.colorPriority ?? 0;
      const cpB = b.colorPriority ?? 0;
      if (cpA !== cpB) {
        if (cpA <= 0) {
          return 1;
        }
        if (cpB <= 0) {
          return -1;
        }
        return cpA - cpB;
      }
      return a.createdAt.localeCompare(b.createdAt);
    });
  };

  // Overview Tab State
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [ghostToggling, setGhostToggling] = useState(false);
  const handleToggleGhostMode = async () => {
    if (ghostToggling) {
      return;
    }
    setGhostToggling(true);
    try {
      await ApiRequest(`/groups/${group.id}/ghost`, 'put');
      showToast.success('Ghost status toggled successfully');
    } catch (err: any) {
      showToast.error(
        err.response?.data?.message || 'Failed to toggle ghost mode',
      );
    } finally {
      setGhostToggling(false);
    }
  };
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
  const [hierarchyPriority, setHierarchyPriority] = useState(0);
  const [colorPriority, setColorPriority] = useState(0);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  // Local roles list and reordering state
  const [localRoles, setLocalRoles] = useState<any[]>(activeGroup?.roles || []);
  const [hasPendingReorder, setHasPendingReorder] = useState(false);

  useEffect(() => {
    if (activeGroup?.roles && !hasPendingReorder) {
      setLocalRoles(activeGroup.roles);
    }
  }, [activeGroup?.roles, hasPendingReorder]);

  // Transfer ownership state
  const [transferTargetUserId, setTransferTargetUserId] = useState('');
  const [transferModalStep, setTransferModalStep] = useState<number | null>(
    null,
  );
  const [titleClicks, setTitleClicks] = useState(0);

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

      // Generate 50x50 avatar thumbnail
      const thumbBlob = await generateAvatarThumbnail(file);
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
          colorPriority,
          hierarchyPriority,
        }),
      ).unwrap();
      setRoleName('');
      setRoleColor('#7289da');
      setSelectedPermissions([]);
      setHierarchyPriority(0);
      setColorPriority(0);
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
    setHierarchyPriority(role.hierarchyPriority ?? role.priority ?? 0);
    setColorPriority(role.colorPriority ?? 0);
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
          colorPriority,
          hierarchyPriority,
        }),
      ).unwrap();
      setEditingRoleId(null);
      setRoleName('');
      setRoleColor('#7289da');
      setSelectedPermissions([]);
      setHierarchyPriority(0);
      setColorPriority(0);
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
        setHierarchyPriority(0);
        setColorPriority(0);
      }
    } catch (err: any) {
      showToast.error(err || 'Failed to delete role.');
    } finally {
      setIsRoleLoading(false);
    }
  };

  const handleSaveReorder = async () => {
    const rolesPayload = localRoles.map((r) => ({
      id: r.id,
      hierarchyPriority: Math.max(r.hierarchyPriority ?? r.priority ?? 1, 1),
      colorPriority: r.colorPriority ?? 0,
    }));
    setIsRoleLoading(true);
    try {
      await dispatch(
        batchUpdateGroupRoles({ groupId: group.id, roles: rolesPayload }),
      ).unwrap();
      showToast.success('Role priorities updated successfully!');
      setHasPendingReorder(false);
    } catch (err: any) {
      showToast.error(err || 'Failed to update roles.');
    } finally {
      setIsRoleLoading(false);
    }
  };

  const handleResetReorder = () => {
    setLocalRoles(activeGroup?.roles || []);
    setHasPendingReorder(false);
  };

  const handleHierarchyDragStart = (e: React.DragEvent, roleId: string) => {
    e.dataTransfer.setData('text/plain', roleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleHierarchyDrop = (e: React.DragEvent, targetLevel: number) => {
    e.preventDefault();
    const roleId = e.dataTransfer.getData('text/plain');
    if (!roleId) {
      return;
    }

    const role = localRoles.find((r) => r.id === roleId);
    if (!role) {
      return;
    }

    // Check if requester can modify this role
    if (
      !isOwner &&
      Math.max(role.hierarchyPriority ?? role.priority ?? 1, 1) <= reqPriority
    ) {
      showToast.error(
        'You cannot modify a role with equal or higher hierarchy authority than your own.',
      );
      return;
    }

    // Check if requester is trying to set priority equal or higher than their own
    if (!isOwner && targetLevel <= reqPriority) {
      showToast.error(
        "You cannot set a role hierarchy level equal to or higher authority than your own highest role's hierarchy priority.",
      );
      return;
    }

    // Update local role hierarchyPriority
    const updatedRoles = localRoles.map((r) => {
      if (r.id === roleId) {
        return {
          ...r,
          hierarchyPriority: targetLevel,
          priority: targetLevel,
        };
      }
      return r;
    });

    setLocalRoles(updatedRoles);
    setHasPendingReorder(true);
  };

  const handleColorDragStart = (
    e: React.DragEvent,
    index: number,
    roleId: string,
  ) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ index, roleId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColorDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) {
      return;
    }

    try {
      const { index: sourceIndex, roleId } = JSON.parse(dataStr);
      if (sourceIndex === targetIndex) {
        return;
      }

      const role = localRoles.find((r) => r.id === roleId);
      if (!role) {
        return;
      }

      // Check if requester can modify this role
      if (
        !isOwner &&
        Math.max(role.hierarchyPriority ?? role.priority ?? 1, 1) <= reqPriority
      ) {
        showToast.error(
          'You cannot modify a role with equal or higher hierarchy authority than your own.',
        );
        return;
      }

      // Sort localRoles by color precedence to align index with current visual order
      const sortedForColor = sortRolesByColorPriority(localRoles);

      const targetRole = sortedForColor[targetIndex];
      if (
        !isOwner &&
        targetRole &&
        Math.max(targetRole.hierarchyPriority ?? targetRole.priority ?? 1, 1) <=
          reqPriority
      ) {
        showToast.error(
          "You cannot reorder roles at or above your own highest role's hierarchy priority.",
        );
        return;
      }

      // Perform reorder on sortedForColor
      const [moved] = sortedForColor.splice(sourceIndex, 1);
      sortedForColor.splice(targetIndex, 0, moved);

      // Reassign colorPriority sequentially: 1, 2, 3...
      const updatedRoles = localRoles.map((r) => {
        const newIdx = sortedForColor.findIndex((sf) => sf.id === r.id);
        return {
          ...r,
          colorPriority: newIdx + 1,
        };
      });

      setLocalRoles(updatedRoles);
      setHasPendingReorder(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmOwnershipTransfer = async () => {
    if (!transferTargetUserId) {
      return;
    }
    setIsLoading(true);
    setTransferModalStep(null);
    try {
      await ApiRequest(`/groups/${group.id}/transfer-ownership`, 'post', {
        newOwnerId: transferTargetUserId,
      });
      showToast.success('Ownership transfer request email sent to member!');
      setTransferTargetUserId('');
      onClose();
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to initiate ownership transfer.';
      showToast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-[rgba(4,6,12,0.65)] backdrop-blur-xs">
      <div
        className="w-full max-w-3xl h-[650px] flex flex-col bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] rounded-[18px] shadow-(--glass-shadow) overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-theme flex items-center justify-between">
          <div>
            <h2
              onClick={() => {
                const next = titleClicks + 1;
                setTitleClicks(next);
                if (next === 5) {
                  showToast.info('Advanced administrative settings unlocked.');
                }
              }}
              className="m-0 text-[18px] font-bold text-theme-primary cursor-default select-none"
            >
              Group Settings
            </h2>
            <p className="m-1 text-[12.5px] text-theme-muted">
              Customize your server settings
            </p>
          </div>
          <button
            id="close-group-settings-modal"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-theme-muted p-1 rounded-md flex items-center active-press"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Tabs */}
        {canManageGroup && canManageRoles && (
          <div className="px-5 border-b border-theme flex gap-4 bg-[rgba(0,0,0,0.02)]">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent transition-all cursor-pointer bg-transparent text-theme-muted hover:text-theme-primary ${
                activeTab === 'overview'
                  ? 'border-(--accent-primary)! text-(--accent-primary)!'
                  : ''
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`py-2 px-1 text-xs font-bold uppercase tracking-wider border-b-2 border-transparent transition-all cursor-pointer bg-transparent text-theme-muted hover:text-theme-primary ${
                activeTab === 'roles'
                  ? 'border-(--accent-primary)! text-(--accent-primary)!'
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
            className="px-5 py-5 flex flex-col gap-4 flex-1 overflow-y-auto"
          >
            {/* Avatar Upload */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl border border-glass bg-[rgba(0,0,0,0.015)] dark:bg-[rgba(255,255,255,0.01)] shadow-sm mb-1 animate-fade-in">
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2">
                  Group Avatar
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer border-none bg-(--theme-btn-active) text-(--theme-btn-active-text) hover:opacity-95 disabled:opacity-50 active-press"
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
                      className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer border border-(--danger-border) bg-(--danger-bg) text-(--danger) hover:bg-(--danger) hover:text-white transition-all active-press"
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
                className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2"
              >
                Group Name <span className="text-(--danger)">*</span>
              </label>
              <input
                id="group-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Awesome Server"
                maxLength={100}
                required
                className="input-base w-full px-3.5 py-2.5 rounded-[10px] bg-theme-input border-[1.5px] border-glass text-theme-primary text-sm box-border focus:outline-none focus:border-(--accent-primary) focus:ring-[2.5px] focus:ring-(--accent-ring)"
              />
            </div>

            <div>
              <label
                htmlFor="group-desc-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2"
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
                className="input-base w-full px-3.5 py-2.5 rounded-[10px] bg-theme-input border-[1.5px] border-glass text-theme-primary text-sm box-border resize-none font-sans focus:outline-none focus:border-(--accent-primary) focus:ring-[2.5px] focus:ring-(--accent-ring)"
              />
            </div>

            {activeGroup?.ownerId === user?.id && titleClicks >= 5 && (
              <div className="mt-6 pt-5 border-t border-theme flex flex-col gap-3">
                <h4 className="m-0 text-xs font-bold text-(--danger) uppercase tracking-wider">
                  Danger Zone
                </h4>
                <p className="m-0 text-[11px] leading-relaxed text-theme-secondary">
                  Transfer ownership of this server to another member. You will
                  lose owner permissions and control.
                </p>
                <div className="flex gap-2 animate-fade-in">
                  <select
                    value={transferTargetUserId}
                    onChange={(e) => setTransferTargetUserId(e.target.value)}
                    className="flex-1 input-base px-3 py-2 rounded-lg bg-theme-input border border-glass text-sm text-theme-primary focus:outline-none focus:border-(--accent-primary)"
                  >
                    <option value="">Select a member...</option>
                    {(activeGroup?.members || [])
                      .filter((m) => m.userId !== user?.id)
                      .map((m) => {
                        const displayName =
                          m.user?.displayName ||
                          m.user?.username ||
                          m.user?.email.split('@')[0];
                        return (
                          <option key={m.userId} value={m.userId}>
                            {displayName}
                          </option>
                        );
                      })}
                  </select>
                  <button
                    type="button"
                    disabled={!transferTargetUserId}
                    onClick={() => setTransferModalStep(1)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border border-(--danger-border) bg-(--danger-bg) text-(--danger) hover:bg-(--danger) hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active-press"
                  >
                    Transfer
                  </button>
                </div>
              </div>
            )}

            {user?.role === 'admin' && (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-glass bg-[rgba(0,0,0,0.015)] dark:bg-[rgba(255,255,255,0.01)] shadow-sm animate-fade-in mt-4">
                <div>
                  <h4 className="m-0 text-sm font-bold text-white">
                    Ghost Mode
                  </h4>
                  <p className="m-0 mt-1 text-[11px] leading-relaxed text-theme-secondary">
                    Vanish from the member list of this group. You will remain
                    in the group but other users won't see you.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={ghostToggling}
                  onClick={handleToggleGhostMode}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-all active-press ${
                    currentUserMember?.isGhost
                      ? 'bg-amber-500 text-white hover:opacity-90'
                      : 'bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  {currentUserMember?.isGhost
                    ? 'Ghost Mode Active'
                    : 'Go Ghost'}
                </button>
              </div>
            )}
          </form>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-4 flex-1 overflow-y-auto">
            {/* Sub-tabs header */}
            <div className="flex gap-2 border-b border-glass pb-2 shrink-0 select-none">
              <button
                type="button"
                onClick={() => setRolesSubTab('manager')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-none ${
                  rolesSubTab === 'manager'
                    ? 'bg-(--accent-primary) text-white'
                    : 'bg-transparent text-theme-secondary hover:bg-white/5'
                }`}
              >
                Roles Manager
              </button>
              <button
                type="button"
                onClick={() => setRolesSubTab('hierarchy')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-none ${
                  rolesSubTab === 'hierarchy'
                    ? 'bg-(--accent-primary) text-white'
                    : 'bg-transparent text-theme-secondary hover:bg-white/5'
                }`}
              >
                Hierarchy Levels
              </button>
              <button
                type="button"
                onClick={() => setRolesSubTab('color')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-none ${
                  rolesSubTab === 'color'
                    ? 'bg-(--accent-primary) text-white'
                    : 'bg-transparent text-theme-secondary hover:bg-white/5'
                }`}
              >
                Color Precedence
              </button>
            </div>

            {rolesSubTab === 'manager' && (
              <div className="flex flex-col gap-4">
                {/* Create/Edit Form */}
                <div className="p-3.5 rounded-xl border-[1.5px] border-glass bg-[rgba(255,255,255,0.02)] flex flex-col gap-3">
                  <span className="text-[12px] font-bold text-theme-primary">
                    {editingRoleId ? 'Edit Role' : 'Create Role'}
                  </span>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                        Role Name
                      </label>
                      <input
                        type="text"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        placeholder="e.g. Staff"
                        maxLength={32}
                        className="input-base w-full px-3 py-2 rounded-lg bg-theme-input border-[1.5px] border-glass text-theme-primary text-sm focus:outline-none focus:border-(--accent-primary)"
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                        Color
                      </label>
                      <div className="relative flex items-center h-9.5 rounded-lg border-[1.5px] border-glass bg-theme-input overflow-hidden">
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
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-1.5">
                      Permissions
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-35 overflow-y-auto pr-1 border border-glass p-2.5 rounded-lg bg-theme-input">
                      {visiblePermissions.map((perm) => {
                        const isChecked = selectedPermissions.includes(
                          perm.value,
                        );
                        return (
                          <label
                            key={perm.value}
                            className="flex items-center gap-2 text-xs text-theme-secondary cursor-pointer hover:text-theme-primary select-none"
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
                              className="w-3.5 h-3.5 accent-(--accent-primary) cursor-pointer"
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
                          setHierarchyPriority(0);
                          setColorPriority(0);
                        }}
                        className="px-3 py-2 rounded-lg border-[1.5px] border-glass bg-transparent text-theme-secondary text-xs font-semibold cursor-pointer active-press"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={
                        editingRoleId ? handleUpdateRole : handleCreateRole
                      }
                      disabled={isRoleLoading || !roleName.trim()}
                      className="btn-send px-4 py-2 rounded-lg border-none text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed active-press"
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
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-2.5">
                    Roles List
                  </span>
                  {localRoles.length === 0 ? (
                    <p className="m-0 text-xs text-theme-muted italic">
                      No roles exist. Create one above to get started.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {localRoles.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between p-2.5 rounded-[10px] border border-glass bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.02)] transition-all"
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
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/15 dark:bg-white/15 text-theme-muted font-bold ml-2 shrink-0">
                              H:{' '}
                              {Math.max(
                                role.hierarchyPriority ?? role.priority ?? 1,
                                1,
                              )}{' '}
                              | C: {role.colorPriority ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(isOwner ||
                              reqPriority <
                                Math.max(
                                  role.hierarchyPriority ?? role.priority ?? 1,
                                  1,
                                )) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(role)}
                                  className="px-2.5 py-1.5 rounded-md text-[11px] font-bold cursor-pointer border border-glass bg-[rgba(255,255,255,0.03)] text-theme-secondary hover:bg-[rgba(255,255,255,0.06)] active-press"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRole(role.id)}
                                  className="px-2.5 py-1.5 rounded-md text-[11px] font-bold cursor-pointer border border-(--danger-border) bg-(--danger-bg) text-(--danger) hover:bg-(--danger) hover:text-white transition-all active-press"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {rolesSubTab === 'hierarchy' && (
              <div className="flex flex-col gap-3 flex-1">
                <div className="p-2 rounded-lg bg-(--accent-ring)/20 border border-glass text-[11px] text-theme-secondary shrink-0">
                  💡 Drag and drop role cards between Levels to change their
                  hierarchy precedence. Equal levels cannot modify each other or
                  higher levels.
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 flex-1 min-h-[300px] scrollbar-thin">
                  {(() => {
                    const maxLvl = Math.max(
                      ...localRoles.map((r) =>
                        Math.max(r.hierarchyPriority ?? r.priority ?? 1, 1),
                      ),
                      1,
                    );
                    const lvls = [];
                    for (let l = 1; l <= maxLvl + 1; l++) {
                      lvls.push(l);
                    }
                    return lvls.map((level) => {
                      const rolesInLevel = localRoles.filter(
                        (r) =>
                          Math.max(
                            r.hierarchyPriority ?? r.priority ?? 1,
                            1,
                          ) === level,
                      );
                      const isNewLevel = level === maxLvl + 1;

                      return (
                        <div
                          key={level}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleHierarchyDrop(e, level)}
                          className={`flex flex-col rounded-xl p-3 min-w-[200px] w-[200px] shrink-0 border transition-all ${
                            isNewLevel
                              ? 'border-dashed border-glass/40 bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.03)]'
                              : 'border-glass bg-[rgba(255,255,255,0.02)]'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-glass mb-3 shrink-0">
                            <span className="text-xs font-bold text-theme-primary">
                              {isNewLevel
                                ? `Level ${level} (New)`
                                : `Level ${level}`}
                            </span>
                            <span className="text-[10px] font-semibold text-theme-muted bg-white/10 px-1.5 py-0.5 rounded">
                              {rolesInLevel.length}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[220px]">
                            {rolesInLevel.map((role) => {
                              const isLocked =
                                !isOwner &&
                                Math.max(
                                  role.hierarchyPriority ?? role.priority ?? 1,
                                  1,
                                ) <= reqPriority;
                              return (
                                <div
                                  key={role.id}
                                  draggable={!isLocked}
                                  onDragStart={(e) =>
                                    handleHierarchyDragStart(e, role.id)
                                  }
                                  className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col gap-1 transition-all select-none ${
                                    isLocked
                                      ? 'border-glass bg-white/5 opacity-60 cursor-not-allowed'
                                      : 'border-glass bg-theme-input/40 cursor-grab hover:bg-theme-input/80 hover:border-(--accent-primary) active:cursor-grabbing'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: role.color }}
                                      />
                                      <span
                                        className="truncate font-semibold"
                                        style={{ color: role.color }}
                                      >
                                        {role.name}
                                      </span>
                                    </div>
                                    {isLocked && (
                                      <span
                                        className="text-[10px] text-theme-muted"
                                        title="Locked (higher/equal priority)"
                                      >
                                        🔒
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-theme-muted flex justify-between">
                                    <span>
                                      Col Priority: {role.colorPriority ?? 0}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {rolesInLevel.length === 0 && (
                              <div className="flex-1 flex items-center justify-center border border-dashed border-glass/25 rounded-lg p-4 text-center min-h-[100px]">
                                <span className="text-[10px] text-theme-muted italic">
                                  Drag roles here
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {rolesSubTab === 'color' && (
              <div className="flex flex-col gap-3 flex-1">
                <div className="p-2 rounded-lg bg-(--accent-ring)/20 border border-glass text-[11px] text-theme-secondary shrink-0">
                  💡 Drag and drop roles to reorder their color precedence.
                  Roles higher up in the list have higher precedence.
                </div>
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[350px] pr-1">
                  {sortRolesByColorPriority(localRoles).map((role, idx) => {
                    const isLocked =
                      !isOwner &&
                      Math.max(
                        role.hierarchyPriority ?? role.priority ?? 1,
                        1,
                      ) <= reqPriority;
                    return (
                      <div
                        key={role.id}
                        draggable={!isLocked}
                        onDragStart={(e) =>
                          handleColorDragStart(e, idx, role.id)
                        }
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleColorDrop(e, idx)}
                        className={`flex items-center justify-between p-3 rounded-[10px] border transition-all select-none ${
                          isLocked
                            ? 'border-glass bg-white/5 opacity-60 cursor-not-allowed'
                            : 'border-glass bg-theme-input/40 cursor-grab hover:bg-theme-input/80 hover:border-(--accent-primary) active:cursor-grabbing'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-theme-muted w-6">
                            #{idx + 1}
                          </span>
                          <div
                            className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: role.color }}
                          />
                          <span
                            style={{ color: role.color }}
                            className="font-semibold text-sm"
                          >
                            {role.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-theme-muted">
                            Hierarchy Level:{' '}
                            {Math.max(
                              role.hierarchyPriority ?? role.priority ?? 1,
                              1,
                            )}
                          </span>
                          {isLocked ? (
                            <span
                              className="text-[11px] text-theme-muted"
                              title="Locked (higher/equal priority)"
                            >
                              🔒 Locked
                            </span>
                          ) : (
                            <span
                              className="text-[11px] text-theme-muted cursor-grab font-bold"
                              title="Drag to reorder"
                            >
                              ☰
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {activeTab === 'overview' ? (
          <div className="px-5 pb-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-[10px] border-[1.5px] border-glass bg-transparent text-theme-secondary text-sm font-semibold cursor-pointer active-press"
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
            {hasPendingReorder ? (
              <>
                <button
                  type="button"
                  onClick={handleResetReorder}
                  disabled={isRoleLoading}
                  className="px-5 py-2.5 rounded-[10px] border-[1.5px] border-glass bg-transparent text-theme-secondary text-sm font-semibold cursor-pointer active-press"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleSaveReorder}
                  disabled={isRoleLoading}
                  className="btn-send px-6 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white active-press"
                >
                  {isRoleLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-[10px] border-[1.5px] border-glass bg-transparent text-theme-secondary text-sm font-semibold cursor-pointer active-press"
              >
                Close
              </button>
            )}
          </div>
        )}

        {transferModalStep !== null && (
          <div className="fixed inset-0 z-1200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="w-100 max-w-full bg-(--glass-bg) border-[1.5px] border-glass rounded-[18px] p-6 shadow-2xl animate-scale-in flex flex-col gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-(--danger-bg) text-(--danger) flex items-center justify-center mx-auto text-xl font-bold animate-pulse">
                ⚠️
              </div>

              {transferModalStep === 1 && (
                <>
                  <h3 className="m-0 text-base font-bold text-theme-primary">
                    Transfer Ownership — Step 1 of 3
                  </h3>
                  <p className="m-0 text-sm leading-relaxed text-theme-secondary">
                    Are you absolutely sure you want to transfer ownership of{' '}
                    <strong>{group.name}</strong>? This is a critical action.
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setTransferModalStep(null)}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-glass bg-transparent text-theme-secondary text-sm font-semibold cursor-pointer active-press"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferModalStep(2)}
                      className="flex-1 px-4 py-2.5 rounded-lg border-none bg-(--danger) text-white text-sm font-semibold cursor-pointer active-press"
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}

              {transferModalStep === 2 && (
                <>
                  <h3 className="m-0 text-base font-bold text-theme-primary">
                    Confirm Transfer — Step 2 of 3
                  </h3>
                  <p className="m-0 text-sm leading-relaxed text-theme-secondary">
                    By transferring ownership, you will lose owner privileges.
                    You will no longer be able to delete this server or manage
                    its administrative settings. You will become a regular
                    member.
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setTransferModalStep(1)}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-glass bg-transparent text-theme-secondary text-sm font-semibold cursor-pointer active-press"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferModalStep(3)}
                      className="flex-1 px-4 py-2.5 rounded-lg border-none bg-(--danger) text-white text-sm font-semibold cursor-pointer active-press"
                    >
                      I Agree
                    </button>
                  </div>
                </>
              )}

              {transferModalStep === 3 && (
                <>
                  <h3 className="m-0 text-base font-bold text-theme-primary">
                    Final Step — Step 3 of 3
                  </h3>
                  <p className="m-0 text-sm leading-relaxed text-theme-secondary">
                    A confirmation link will be sent to the selected member's
                    registered email address. The ownership transfer will be
                    finalized ONLY once they accept it.
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setTransferModalStep(2)}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-glass bg-transparent text-theme-secondary text-sm font-semibold cursor-pointer active-press"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmOwnershipTransfer()}
                      className="flex-1 px-4 py-2.5 rounded-lg border-none bg-(--accent-primary) text-white text-sm font-semibold cursor-pointer active-press"
                    >
                      Send Request Mail
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
