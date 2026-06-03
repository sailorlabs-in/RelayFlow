import React, { useState } from 'react';

import { useAppDispatch } from '../store';
import type { GroupChannel } from '../store/slices/groupsSlice';
import { updateChannel, deleteChannel } from '../store/slices/groupsSlice';

import { IconX, IconHash, IconTrash } from './Icons';
import { showToast } from './toast';

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

  const sanitize = (val: string) =>
    val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

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
      await dispatch(updateChannel({ groupId, channelId: channel.id, name: cleanName })).unwrap();
      showToast.success(`Channel renamed to #${cleanName}!`);
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to rename channel.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (channel.name === 'general') {
      showToast.error('Cannot delete the general channel.');
      return;
    }
    if (!window.confirm(`Delete channel #${channel.name}? This will permanently erase all message history in this channel.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await dispatch(deleteChannel({ groupId, channelId: channel.id })).unwrap();
      showToast.success(`Channel #${channel.name} deleted.`);
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to delete channel.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(4,6,12,0.65)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '420px',
          maxWidth: '100%',
          background: 'var(--glass-bg)',
          border: '1.5px solid var(--glass-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '18px',
          boxShadow: 'var(--glass-shadow)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1.5px solid var(--border-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Channel Settings
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Edit or remove <strong style={{ color: 'var(--text-secondary)' }}>#{channel.name}</strong>
            </p>
          </div>
          <button
            id="close-channel-settings-modal"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label
              htmlFor="channel-name-input"
              style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}
            >
              Channel Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}>
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
                className="input-base"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  borderRadius: '10px',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2.5px var(--accent-ring)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Delete Area */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1.5px dashed var(--danger)',
              background: 'var(--danger-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)' }}>Delete Channel</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>This action is permanent.</div>
            </div>
            <button
              id="delete-channel-btn"
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--danger)',
                color: 'white',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                opacity: isDeleting ? 0.6 : 1,
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
              }}
            >
              <IconTrash />
              <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            padding: '0 24px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid var(--glass-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            id="channel-settings-save-btn"
            type="button"
            onClick={handleSave}
            disabled={isLoading || !name.trim() || name === channel.name}
            className="btn-send"
            style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: isLoading || !name.trim() || name === channel.name ? 'not-allowed' : 'pointer', opacity: isLoading || !name.trim() || name === channel.name ? 0.5 : 1, color: 'white' }}
          >
            {isLoading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
