import React, { useState } from 'react';

import { useAppDispatch } from '../store';
import { createChannel } from '../store/slices/groupsSlice';

import { IconX, IconHash } from './Icons';
import { showToast } from './toast';

interface CreateChannelModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

export const CreateChannelModal = ({
  groupId,
  groupName,
  onClose,
}: CreateChannelModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const [channelName, setChannelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sanitize = (val: string) =>
    val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChannelName(sanitize(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = channelName.trim();
    if (!name) {
      showToast.error('Please enter a channel name.');
      return;
    }
    setIsLoading(true);
    try {
      await dispatch(createChannel({ groupId, name })).unwrap();
      showToast.success(`Channel #${name} created!`);
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to create channel.');
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
        className="w-[420px] max-w-full bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[18px] shadow-[var(--glass-shadow)] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-muted)] flex items-start justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-[var(--text-primary)]">
              Create Channel
            </h2>
            <p className="m-1 text-[12.5px] text-[var(--text-muted)]">
              In{' '}
              <strong className="text-[var(--text-secondary)]">
                {groupName}
              </strong>
            </p>
          </div>
          <button
            id="close-create-channel-modal"
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 rounded-md flex items-center active-press"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-5">
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
              value={channelName}
              onChange={handleNameChange}
              placeholder="new-channel"
              maxLength={80}
              required
              autoFocus
              className="input-base w-full py-2.5 pl-9 pr-3.5 rounded-[10px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] text-sm box-border font-mono focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[2.5px] focus:ring-[var(--accent-ring)]"
            />
          </div>

          <p className="m-2 text-xs text-[var(--text-muted)]">
            Channel names must be lowercase, with no spaces. Spaces become
            dashes.
          </p>
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
            id="create-channel-submit-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !channelName.trim()}
            className="btn-send px-6 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 active-press"
          >
            {isLoading ? 'Creating…' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
};
