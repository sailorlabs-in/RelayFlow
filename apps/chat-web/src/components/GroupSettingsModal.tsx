import React, { useState, useRef } from 'react';

import { useAppDispatch } from '../store';
import type { Group } from '../store/slices/groupsSlice';
import { updateGroup } from '../store/slices/groupsSlice';

import { IconX } from './Icons';
import { showToast } from './toast';
import { Avatar } from './Avatar';
import { generateImageThumbnail } from '../utils/media';

interface GroupSettingsModalProps {
  group: Group;
  onClose: () => void;
}

export const GroupSettingsModal = ({
  group,
  onClose,
}: GroupSettingsModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [avatarUrl, setAvatarUrl] = useState(group.avatarUrl || '');
  const [avatarThumbnailUrl, setAvatarThumbnailUrl] = useState(
    group.avatarThumbnailUrl || '',
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

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

      // Generate 20% thumbnail
      const thumbBlob = await generateImageThumbnail(file);
      const thumbFile = new File([thumbBlob], `thumb_${file.name}`, {
        type: 'image/jpeg',
      });

      const formData = new FormData();
      formData.append('bucket', 'relayflow');
      formData.append('folder', 'profile-media');
      formData.append('files', file);
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
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
              autoFocus
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

        {/* Footer */}
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
      </div>
    </div>
  );
};
