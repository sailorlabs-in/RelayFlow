import React, { useState } from 'react';

import { useAppDispatch } from '../store';
import type { Group } from '../store/slices/groupsSlice';
import { updateGroup } from '../store/slices/groupsSlice';

import { IconX } from './Icons';
import { showToast } from './toast';

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
  const [isLoading, setIsLoading] = useState(false);

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
