import React, { useState } from 'react';
import { useAppDispatch } from '../store';
import { updateGroup, Group } from '../store/slices/groupsSlice';
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
      await dispatch(updateGroup({ groupId: group.id, name: name.trim(), description: description.trim() })).unwrap();
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
          width: '440px',
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
              Group Settings
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Customize your server settings
            </p>
          </div>
          <button
            id="close-group-settings-modal"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="group-name-input"
              style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}
            >
              Group Name <span style={{ color: 'var(--danger)' }}>*</span>
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
              className="input-base"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                border: '1.5px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2.5px var(--accent-ring)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div>
            <label
              htmlFor="group-desc-input"
              style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}
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
              className="input-base"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                border: '1.5px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2.5px var(--accent-ring)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
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
            id="group-settings-submit-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !name.trim()}
            className="btn-send"
            style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: isLoading || !name.trim() ? 'not-allowed' : 'pointer', opacity: isLoading || !name.trim() ? 0.5 : 1, color: 'white' }}
          >
            {isLoading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
