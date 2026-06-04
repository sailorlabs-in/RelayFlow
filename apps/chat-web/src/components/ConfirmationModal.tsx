import React from 'react';
import { IconX } from './Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'info',
  onConfirm,
  onCancel,
}: ConfirmationModalProps): React.JSX.Element | null => {
  if (!isOpen) {
    return null;
  }

  const isDanger = type === 'danger';

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-[rgba(4,6,12,0.65)] backdrop-blur-[4px] animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-[400px] max-w-full bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[6px] rounded-[18px] shadow-[var(--glass-shadow)] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-muted)] flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {isDanger ? (
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--danger-bg)] text-[var(--danger)] shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-4 h-4"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
            ) : (
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--theme-btn-active)] text-[var(--accent-primary)] shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-4 h-4"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
            )}
            <h3 className="m-0 text-[16px] font-bold text-[var(--text-primary)]">
              {title}
            </h3>
          </div>
          <button
            id="confirmation-modal-close"
            onClick={onCancel}
            className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 rounded-md flex items-center shrink-0 active-press"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
          {message}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4.5 py-2.5 rounded-[10px] border-[1.5px] border-[var(--glass-border)] bg-transparent text-[var(--text-secondary)] text-sm font-semibold cursor-pointer active-press"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5.5 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white cursor-pointer active-press shadow-sm ${
              isDanger ? 'bg-[var(--danger)] hover:brightness-105' : 'btn-send'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
