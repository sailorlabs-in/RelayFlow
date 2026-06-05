import React, { useState } from 'react';

import { useAppDispatch } from '../store';
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
  const [name, setName] = useState(channel.name);
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
        updateChannel({ groupId, channelId: channel.id, name: cleanName }),
      ).unwrap();
      showToast.success(`Channel renamed to #${cleanName}!`);
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to rename channel.');
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
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[rgba(4,6,12,0.65)] backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        className="w-[420px] max-w-full bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[18px] shadow-[var(--glass-shadow)] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-muted)] flex items-center justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-[var(--text-primary)]">
              Channel Settings
            </h2>
            <p className="m-1 text-[12.5px] text-[var(--text-muted)]">
              Edit or remove{' '}
              <strong className="text-[var(--text-secondary)]">
                #{channel.name}
              </strong>
            </p>
          </div>
          <button
            id="close-channel-settings-modal"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 rounded-md flex items-center active-press"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="px-5 py-5 flex flex-col gap-4">
          <div>
            <label
              htmlFor="channel-name-input"
              className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2"
            >
              Channel Name <span className="text-[var(--danger)]">*</span>
            </label>

            <div className="relative flex items-center">
              <span className="absolute left-3 text-[var(--text-muted)] pointer-events-none flex items-center">
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
                className="input-base w-full py-2.5 pl-9 pr-3.5 rounded-[10px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] text-sm box-border font-mono focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[2.5px] focus:ring-[var(--accent-ring)]"
              />
            </div>
          </div>

          {/* Delete Area */}
          <div className="p-3.5 rounded-xl border-[1.5px] border-dashed border-[var(--danger)] bg-[var(--danger-bg)] flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-bold text-[var(--danger)]">
                Delete Channel
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                This action is permanent.
              </div>
            </div>
            <button
              id="delete-channel-btn"
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border-none bg-[var(--danger)] text-white text-[12.5px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_2px_8px_rgba(239, 68, 68, 0.25)] hover:brightness-105 transition-all active-press"
            >
              <IconTrash />
              <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
            </button>
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
            id="channel-settings-save-btn"
            type="button"
            onClick={handleSave}
            disabled={isLoading || !name.trim() || name === channel.name}
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
