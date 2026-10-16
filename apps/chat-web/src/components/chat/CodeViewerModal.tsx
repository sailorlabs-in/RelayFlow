import React, { useEffect, useState } from 'react';
import { IconX } from '../Icons';
import { showToast } from '../toast';

interface CodeViewerModalProps {
  viewingCode: {
    code: string;
    language: string;
  } | null;
  onClose: () => void;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  viewingCode,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!viewingCode) {
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(viewingCode.code);
    setCopied(true);
    showToast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[1300] flex flex-col items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-(--glass-bg) border border-glass rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-slide-up backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme bg-theme-input/30">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary)">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-4 h-4"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </span>
            <h3 className="m-0 text-[15px] font-bold text-theme-primary">
              {viewingCode.language
                ? `${viewingCode.language} code block`
                : 'Code snippet'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-(--accent-primary) hover:bg-(--accent-primary)/90 text-white text-[12px] font-bold border-none cursor-pointer flex items-center gap-1.5 transition-all active-press shadow-xs"
            >
              {copied ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-transparent border-none cursor-pointer text-theme-muted hover:text-theme-primary p-1.5 rounded-lg flex items-center justify-center hover:bg-theme-input transition-colors active-press"
              title="Close (Esc)"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>
        {/* Code Content */}
        <div className="p-4 overflow-y-auto flex-1 bg-theme-input/10">
          <pre className="m-0 p-4 rounded-xl bg-theme-chat border border-glass/40 overflow-x-auto text-[13px] font-mono leading-relaxed text-theme-primary selection:bg-(--accent-primary)/30">
            <code>{viewingCode.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
