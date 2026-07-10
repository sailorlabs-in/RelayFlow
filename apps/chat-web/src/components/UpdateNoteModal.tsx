'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ApiRequest from '../utils/ApiRequest';

interface UpdateNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface UpdateNoteModalProps {
  /** If provided, display this note directly (from real-time push). */
  note?: UpdateNote | null;
  onDismiss: () => void;
}

/**
 * Modal that displays unseen platform update notes to users.
 * Supports markdown rendering and marks the note as seen on dismissal.
 */
export function UpdateNoteModal({
  note: pushedNote,
  onDismiss,
}: UpdateNoteModalProps) {
  const [notes, setNotes] = useState<UpdateNote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!pushedNote);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (pushedNote) {
      setNotes([pushedNote]);
      setLoading(false);
      return;
    }

    // Fetch unseen notes from API
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiRequest('/users/update-notes/unseen', 'get');
        const data = res?.data || res || [];
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setNotes(data);
        } else if (!cancelled) {
          // No unseen notes, close modal
          onDismiss();
        }
      } catch {
        if (!cancelled) {
          onDismiss();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentNote = notes[currentIndex];

  const handleDismiss = async () => {
    if (!currentNote) {
      onDismiss();
      return;
    }

    setMarking(true);
    try {
      await ApiRequest(
        `/users/update-notes/${currentNote.id}/mark-seen`,
        'post',
      );
    } catch {
      // Mark-seen failure shouldn't block dismissal
    }

    if (currentIndex < notes.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setMarking(false);
    } else {
      setMarking(false);
      onDismiss();
    }
  };

  if (loading || !currentNote) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel max-w-lg w-full max-h-[80vh] flex flex-col animate-slide-up border border-glass overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 pb-4 border-b border-glass shrink-0">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-theme-primary leading-tight truncate">
              {currentNote.title}
            </h2>
            <p className="text-[10px] text-theme-muted mt-0.5">
              {new Date(currentNote.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {notes.length > 1 && (
                <span className="ml-2 text-theme-secondary font-bold">
                  {currentIndex + 1} of {notes.length}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg border border-glass bg-theme-input hover:bg-theme-input-focus text-theme-muted hover:text-theme-primary transition-all cursor-pointer shrink-0"
            title="Dismiss"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Markdown Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="markdown-body text-sm text-theme-primary leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {currentNote.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 pt-4 border-t border-glass shrink-0">
          <p className="text-[10px] text-theme-muted">
            View past notes in{' '}
            <span className="text-theme-secondary font-semibold">
              Settings → Update Notes
            </span>
          </p>
          <button
            onClick={handleDismiss}
            disabled={marking}
            className="btn-send px-5 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {marking
              ? 'Dismissing...'
              : currentIndex < notes.length - 1
                ? 'Next'
                : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
