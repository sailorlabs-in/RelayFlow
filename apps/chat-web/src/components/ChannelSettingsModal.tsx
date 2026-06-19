import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { GroupChannel } from '../store/slices/groupsSlice';
import { updateChannel, deleteChannel } from '../store/slices/groupsSlice';

import { IconX, IconHash, IconTrash } from './Icons';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';

interface ChannelSettingsModalProps {
  groupId: string;
  channel: GroupChannel;
  onClose: () => void;
}

export const ChannelSettingsModal = ({
  groupId,
  channel,
  onClose,
}: ChannelSettingsModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();

  // Select group & roles
  const group = useAppSelector((state) =>
    state.groups.groups.find((g) => g.id === groupId),
  );
  const roles = group?.roles || [];

  const [name, setName] = useState(channel.name);
  const [isPrivate, setIsPrivate] = useState(
    !!channel.allowedRoleIds?.length ||
      !!channel.readRoleIds?.length ||
      !!channel.writeRoleIds?.length ||
      !!channel.hiddenFromUserIds?.length,
  );
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>(
    channel.allowedRoleIds || [],
  );
  const [readRoleIds, setReadRoleIds] = useState<string[]>(
    channel.readRoleIds || [],
  );
  const [writeRoleIds, setWriteRoleIds] = useState<string[]>(
    channel.writeRoleIds || [],
  );
  const [hiddenFromUserIds, setHiddenFromUserIds] = useState<string[]>(
    channel.hiddenFromUserIds || [],
  );
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const sanitize = (val: string) =>
    val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(sanitize(e.target.value));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showToast.error('Please enter a channel name.');
      return;
    }
    if (channel.name === 'general') {
      showToast.error('Cannot rename the general channel.');
      return;
    }
    setIsLoading(true);
    try {
      await dispatch(
        updateChannel({
          groupId,
          channelId: channel.id,
          name: cleanName,
          allowedRoleIds: isPrivate ? allowedRoleIds : [],
          readRoleIds: isPrivate ? readRoleIds : [],
          writeRoleIds: isPrivate ? writeRoleIds : [],
          hiddenFromUserIds: isPrivate ? hiddenFromUserIds : [],
        }),
      ).unwrap();
      showToast.success('Channel configurations updated!');
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to update channel.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (channel.name === 'general') {
      showToast.error('Cannot delete the general channel.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Channel',
      message: `Are you sure you want to delete channel #${channel.name}? This will permanently erase all message history in this channel.`,
      confirmLabel: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        setConfirmModal(null);
        try {
          await dispatch(
            deleteChannel({ groupId, channelId: channel.id }),
          ).unwrap();
          showToast.success(`Channel #${channel.name} deleted.`);
          onClose();
        } catch (err: any) {
          showToast.error(err || 'Failed to delete channel.');
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-[rgba(4,6,12,0.65)] backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-110 max-w-full bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] rounded-[18px] shadow-(--glass-shadow) overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-theme flex items-center justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-theme-primary">
              Channel Settings
            </h2>
            <p className="m-1 text-[12.5px] text-theme-muted">
              Edit or remove{' '}
              <strong className="text-theme-secondary">#{channel.name}</strong>
            </p>
          </div>
          <button
            id="close-channel-settings-modal"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-theme-muted p-1 rounded-md flex items-center active-press"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSave}
          className="px-5 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto"
        >
          <div>
            <label
              htmlFor="channel-name-input"
              className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2"
            >
              Channel Name <span className="text-(--danger)">*</span>
            </label>

            <div className="relative flex items-center">
              <span className="absolute left-3 text-theme-muted pointer-events-none flex items-center">
                <IconHash />
              </span>
              <input
                id="channel-name-input"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="channel-name"
                maxLength={80}
                required
                disabled={channel.name === 'general'}
                className="input-base w-full py-2.5 pl-9 pr-3.5 rounded-[10px] bg-theme-input border-[1.5px] border-glass text-theme-primary text-sm box-border font-mono focus:outline-none focus:border-(--accent-primary) focus:ring-[2.5px] focus:ring-(--accent-ring) disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Private Channel Toggle */}
          {channel.name !== 'general' && (
            <div className="p-3.5 rounded-xl border-[1.5px] border-glass bg-[rgba(255,255,255,0.02)] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-bold text-theme-primary">
                    Private Channel
                  </span>
                  <p className="m-0 mt-0.5 text-[11px] text-theme-muted">
                    Only selected roles will be able to view this channel
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-theme-input peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-(--accent-primary)"></div>
                </label>
              </div>

              {isPrivate && (
                <div className="flex flex-col gap-4 mt-2 border-t border-theme pt-3">
                  {/* Read Access Roles */}
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-theme-secondary mb-2">
                      Who can read / view
                    </span>
                    {roles.length === 0 ? (
                      <p className="m-0 text-xs text-theme-muted italic">
                        No custom roles exist. Create roles in Server Settings
                        first.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-25 overflow-y-auto pr-1">
                        {roles.map((role) => (
                          <label
                            key={role.id}
                            className="flex items-center gap-2.5 text-sm cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={readRoleIds.includes(role.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setReadRoleIds([...readRoleIds, role.id]);
                                  setAllowedRoleIds([
                                    ...allowedRoleIds,
                                    role.id,
                                  ]);
                                } else {
                                  setReadRoleIds(
                                    readRoleIds.filter((id) => id !== role.id),
                                  );
                                  setAllowedRoleIds(
                                    allowedRoleIds.filter(
                                      (id) => id !== role.id,
                                    ),
                                  );
                                }
                              }}
                              className="rounded border-glass text-(--accent-primary) focus:ring-(--accent-primary)"
                            />
                            <span
                              style={{ color: role.color }}
                              className="font-semibold text-theme-primary"
                            >
                              {role.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Write Access Roles */}
                  <div className="border-t border-theme pt-3">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-theme-secondary mb-2">
                      Who can message / write
                    </span>
                    {roles.length === 0 ? (
                      <p className="m-0 text-xs text-theme-muted italic">
                        No custom roles exist. Create roles in Server Settings
                        first.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-25 overflow-y-auto pr-1">
                        {roles.map((role) => (
                          <label
                            key={role.id}
                            className="flex items-center gap-2.5 text-sm cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={writeRoleIds.includes(role.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setWriteRoleIds([...writeRoleIds, role.id]);
                                } else {
                                  setWriteRoleIds(
                                    writeRoleIds.filter((id) => id !== role.id),
                                  );
                                }
                              }}
                              className="rounded border-glass text-(--accent-primary) focus:ring-(--accent-primary)"
                            />
                            <span
                              style={{ color: role.color }}
                              className="font-semibold text-theme-primary"
                            >
                              {role.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hide Channel From */}
                  <div className="border-t border-theme pt-3">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-theme-secondary mb-2">
                      Hide channel from
                    </span>
                    <div className="mb-2">
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="input-base w-full py-1.5 px-3 rounded-lg bg-theme-input border border-glass text-theme-primary text-xs box-border focus:outline-none focus:border-(--accent-primary)"
                      />
                    </div>
                    {group?.members.length === 0 ? (
                      <p className="m-0 text-xs text-theme-muted italic">
                        No members exist in this server.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-25 overflow-y-auto pr-1">
                        {group?.members
                          .filter((m) => {
                            const name =
                              m.user?.displayName ||
                              m.user?.username ||
                              m.user?.email ||
                              '';
                            return name
                              .toLowerCase()
                              .includes(memberSearchQuery.toLowerCase());
                          })
                          .map((m) => {
                            const isSelected = hiddenFromUserIds.includes(
                              m.userId,
                            );
                            const name =
                              m.user?.displayName ||
                              m.user?.username ||
                              m.user?.email ||
                              m.userId;
                            return (
                              <label
                                key={m.userId}
                                className="flex items-center gap-2.5 text-sm cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setHiddenFromUserIds([
                                        ...hiddenFromUserIds,
                                        m.userId,
                                      ]);
                                    } else {
                                      setHiddenFromUserIds(
                                        hiddenFromUserIds.filter(
                                          (id) => id !== m.userId,
                                        ),
                                      );
                                    }
                                  }}
                                  className="rounded border-glass text-(--accent-primary) focus:ring-(--accent-primary)"
                                />
                                <span className="text-theme-primary truncate">
                                  {name}
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delete Area */}
          {channel.name !== 'general' && (
            <div className="p-3.5 rounded-xl border-[1.5px] border-dashed border-(--danger) bg-(--danger-bg) flex items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-bold text-(--danger)">
                  Delete Channel
                </div>
                <div className="text-[11px] text-theme-muted mt-0.5">
                  This action is permanent.
                </div>
              </div>
              <button
                id="delete-channel-btn"
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-none bg-(--danger) text-white text-[12.5px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_2px_8px_rgba(239, 68, 68, 0.25)] hover:brightness-105 transition-all active-press"
              >
                <IconTrash />
                <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-[10px] border-[1.5px] border-glass bg-transparent text-theme-secondary text-sm font-semibold cursor-pointer active-press"
          >
            Cancel
          </button>
          <button
            id="channel-settings-save-btn"
            type="button"
            onClick={handleSave}
            disabled={
              isLoading ||
              !name.trim() ||
              !(
                name !== channel.name ||
                isPrivate !==
                  (!!channel.allowedRoleIds?.length ||
                    !!channel.readRoleIds?.length ||
                    !!channel.writeRoleIds?.length ||
                    !!channel.hiddenFromUserIds?.length) ||
                (isPrivate &&
                  (JSON.stringify(allowedRoleIds.sort()) !==
                    JSON.stringify(
                      [...(channel.allowedRoleIds || [])].sort(),
                    ) ||
                    JSON.stringify(readRoleIds.sort()) !==
                      JSON.stringify([...(channel.readRoleIds || [])].sort()) ||
                    JSON.stringify(writeRoleIds.sort()) !==
                      JSON.stringify(
                        [...(channel.writeRoleIds || [])].sort(),
                      ) ||
                    JSON.stringify(hiddenFromUserIds.sort()) !==
                      JSON.stringify(
                        [...(channel.hiddenFromUserIds || [])].sort(),
                      )))
              )
            }
            className="btn-send px-6 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 active-press"
          >
            {isLoading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};
