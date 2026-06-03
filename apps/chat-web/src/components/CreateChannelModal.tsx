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
    val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

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
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Create Channel
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              In <strong style={{ color: 'var(--text-secondary)' }}>{groupName}</strong>
            </p>
          </div>
          <button
            id="close-create-channel-modal"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
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
              value={channelName}
              onChange={handleNameChange}
              placeholder="new-channel"
              maxLength={80}
              required
              autoFocus
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

          <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Channel names must be lowercase, with no spaces. Spaces become dashes.
          </p>
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
            id="create-channel-submit-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !channelName.trim()}
            className="btn-send"
            style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: isLoading || !channelName.trim() ? 'not-allowed' : 'pointer', opacity: isLoading || !channelName.trim() ? 0.5 : 1, color: 'white' }}
          >
            {isLoading ? 'Creating…' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
};
