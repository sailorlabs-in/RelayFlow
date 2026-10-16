'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconLink,
  IconList,
  IconQuote,
} from '../../../components/Icons';

export interface AdminNoteModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialTitle: string;
  initialContent: string;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
  submitting: boolean;
}

export const AdminNoteModal: React.FC<AdminNoteModalProps> = ({
  isOpen,
  mode,
  initialTitle,
  initialContent,
  onClose,
  onSave,
  submitting,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (prefix: string, suffix = '') => {
    if (!textareaRef.current) {
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = content;
    const selectedText = text.substring(start, end);

    if (!suffix) {
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + prefix + selectedText + after;
      setContent(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            start + prefix.length,
            end + prefix.length,
          );
        }
      }, 0);
      return;
    }

    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + prefix + selectedText + suffix + after;
    setContent(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + prefix.length,
          end + prefix.length,
        );
      }
    }, 0);
  };

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    setEditorTab('write');
  }, [initialTitle, initialContent, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(title, content);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel p-6 max-w-2xl w-full animate-slide-up flex flex-col gap-4 border border-glass max-h-[90vh] shadow-2xl">
        <div className="flex items-center justify-between border-b border-glass pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-theme-secondary">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-theme-primary">
                {mode === 'create' ? 'Publish Update Note' : 'Edit Update Note'}
              </h2>
              <p className="text-xs text-theme-muted">
                {mode === 'create'
                  ? 'Publish a new update note with markdown support.'
                  : 'Modify an existing published update note.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border border-glass bg-theme-input hover:bg-theme-input-focus text-theme-muted hover:text-theme-primary transition-all cursor-pointer"
          >
            <svg
              className="w-4.5 h-4.5"
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="E.g., Version 1.2.0 - Voice Chat & Screen Share"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-base focus:input-focus bg-theme-input/40 rounded-xl p-3 text-xs text-theme-primary placeholder-theme-muted transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                Content (Markdown Supported){' '}
                <span className="text-red-400">*</span>
              </label>
              <div className="flex bg-theme-input/60 p-0.5 rounded-lg border border-glass">
                <button
                  type="button"
                  onClick={() => setEditorTab('write')}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                    editorTab === 'write'
                      ? 'bg-theme-secondary text-white shadow-sm'
                      : 'text-theme-muted hover:text-theme-primary'
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('preview')}
                  className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                    editorTab === 'preview'
                      ? 'bg-theme-secondary text-white shadow-sm'
                      : 'text-theme-muted hover:text-theme-primary'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {editorTab === 'write' ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-input/20 border border-glass border-b-0 rounded-t-xl overflow-x-auto min-h-[36px]">
                  <button
                    type="button"
                    onClick={() => applyFormat('# ')}
                    className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center min-w-[24px] cursor-pointer"
                    title="Heading 1"
                  >
                    <span className="text-[11px] font-bold">H1</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('## ')}
                    className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center min-w-[24px] cursor-pointer"
                    title="Heading 2"
                  >
                    <span className="text-[11px] font-bold">H2</span>
                  </button>
                  <div className="w-px h-4 bg-theme/20 mx-1" />
                  <button
                    type="button"
                    onClick={() => applyFormat('**', '**')}
                    className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors cursor-pointer"
                    title="Bold"
                  >
                    <IconBold />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('*', '*')}
                    className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors cursor-pointer"
                    title="Italic"
                  >
                    <IconItalic />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('~~', '~~')}
                    className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors cursor-pointer"
                    title="Strikethrough"
                  >
                    <IconStrikethrough />
                  </button>
                  <div className="w-px h-4 bg-theme/20 mx-1" />
                  <button
                    type="button"
                    onClick={() => applyFormat('`', '`')}
                    className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors cursor-pointer"
                    title="Inline Code"
                  >
                    <IconCode />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('```\n', '\n```')}
                    className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center w-6 h-6 cursor-pointer"
                    title="Code Block"
                  >
                    <span className="text-[10px] font-bold mt-0.5">
                      {'</>'}
                    </span>
                  </button>
                  <div className="w-px h-4 bg-theme/20 mx-1" />
                  <button
                    type="button"
                    onClick={() => applyFormat('[', '](url)')}
                    className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors cursor-pointer"
                    title="Link"
                  >
                    <IconLink />
                  </button>
                  <div className="w-px h-4 bg-theme/20 mx-1" />
                  <button
                    type="button"
                    onClick={() => applyFormat('- ')}
                    className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors cursor-pointer"
                    title="List"
                  >
                    <IconList />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat('> ')}
                    className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors cursor-pointer"
                    title="Quote"
                  >
                    <IconQuote />
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  required
                  placeholder="### What's New&#10;- Added super cool voice dashboards&#10;- Improved security layers&#10;&#10;Use markdown syntax like **bold**, *italics*, [links](url), lists, code blocks."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="input-base focus:input-focus bg-theme-input/40 rounded-b-xl rounded-t-none p-3 text-xs text-theme-primary placeholder-theme-muted font-mono resize-none flex-1 overflow-y-auto border-t-0"
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto border border-glass bg-theme-input/20 rounded-xl p-3 max-h-[300px]">
                <div className="markdown-body text-xs text-theme-primary leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content ||
                      '*No content preview available. Write some text first!*'}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-glass shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-theme-secondary hover:text-theme-primary bg-transparent border border-glass rounded-lg cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="btn-send px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer active-press disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting
                ? 'Publishing...'
                : mode === 'create'
                  ? 'Publish'
                  : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
