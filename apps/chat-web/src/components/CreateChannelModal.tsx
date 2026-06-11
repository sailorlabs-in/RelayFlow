import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import { createChannel } from '../store/slices/groupsSlice';

import { IconX, IconHash } from './Icons';
import { showToast } from './toast';

interface CreateChannelModalProps {
  groupId: string;
  groupName: string;
  sectionId?: string;
  onClose: () => void;
}

export const CreateChannelModal = ({
  groupId,
  groupName,
  sectionId,
  onClose,
}: CreateChannelModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();

  // Select group & roles
  const group = useAppSelector((state) =>
    state.groups.groups.find((g) => g.id === groupId),
  );
  const roles = group?.roles || [];

  const [channelName, setChannelName] = useState('');
  const [layout, setLayout] = useState<'text' | 'bubble' | 'voice'>('text');
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>([]);
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
      await dispatch(
        createChannel({
          groupId,
          name,
          layout,
          allowedRoleIds: isPrivate ? allowedRoleIds : [],
          sectionId,
        }),
      ).unwrap();
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
        className="w-[440px] max-w-full bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[18px] shadow-[var(--glass-shadow)] overflow-hidden animate-slide-up"
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
        <form
          onSubmit={handleSubmit}
          className="px-5 py-5 max-h-[70vh] overflow-y-auto"
        >
          <div className="mb-4">
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
          </div>

          {/* Layout Select */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Channel Type
            </label>
            <div className="flex gap-3">
              <label
                className={`flex-1 flex flex-col p-3 rounded-[10px] border-[1.5px] cursor-pointer transition-all ${layout === 'text' ? 'border-[var(--accent-primary)] bg-[rgba(114,137,218,0.1)]' : 'border-[var(--glass-border)] bg-transparent'}`}
              >
                <input
                  type="radio"
                  name="channelLayout"
                  value="text"
                  checked={layout === 'text'}
                  onChange={() => setLayout('text')}
                  className="hidden"
                />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Text Channel
                </span>
                <span className="text-xs text-[var(--text-muted)] mt-1">
                  Classic flat feed
                </span>
              </label>
              <label
                className={`flex-1 flex flex-col p-3 rounded-[10px] border-[1.5px] cursor-pointer transition-all ${layout === 'bubble' ? 'border-[var(--accent-primary)] bg-[rgba(114,137,218,0.1)]' : 'border-[var(--glass-border)] bg-transparent'}`}
              >
                <input
                  type="radio"
                  name="channelLayout"
                  value="bubble"
                  checked={layout === 'bubble'}
                  onChange={() => setLayout('bubble')}
                  className="hidden"
                />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Conversation Channel
                </span>
                <span className="text-xs text-[var(--text-muted)] mt-1">
                  WhatsApp-style bubble feed
                </span>
              </label>
              <label
                className={`flex-1 flex flex-col p-3 rounded-[10px] border-[1.5px] cursor-pointer transition-all ${layout === 'voice' ? 'border-[var(--accent-primary)] bg-[rgba(114,137,218,0.1)]' : 'border-[var(--glass-border)] bg-transparent'}`}
              >
                <input
                  type="radio"
                  name="channelLayout"
                  value="voice"
                  checked={layout === 'voice'}
                  onChange={() => setLayout('voice')}
                  className="hidden"
                />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Voice Channel
                </span>
                <span className="text-xs text-[var(--text-muted)] mt-1">
                  Interactive voice room
                </span>
              </label>
            </div>
          </div>

          {/* Private Channel Toggle */}
          <div className="mb-4 mt-5 p-3 rounded-[10px] border-[1.5px] border-[var(--glass-border)] bg-[rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Private Channel
                </span>
                <p className="m-0 mt-0.5 text-xs text-[var(--text-muted)]">
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
                <div className="w-9 h-5 bg-[var(--bg-input)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
              </label>
            </div>

            {isPrivate && (
              <div className="mt-4 border-t border-[var(--border-muted)] pt-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  Select Roles
                </span>
                {roles.length === 0 ? (
                  <p className="m-0 text-xs text-[var(--text-muted)] italic">
                    No custom roles exist. Create roles in Server Settings
                    first, or only Owners/Admins will access this channel.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-2.5 text-sm cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={allowedRoleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllowedRoleIds([...allowedRoleIds, role.id]);
                            } else {
                              setAllowedRoleIds(
                                allowedRoleIds.filter((id) => id !== role.id),
                              );
                            }
                          }}
                          className="rounded border-[var(--glass-border)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                        />
                        <span
                          style={{ color: role.color }}
                          className="font-semibold text-[var(--text-primary)]"
                        >
                          {role.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
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
