'use client';

import React from 'react';
import type { UpdateNoteData } from './adminTypes';

interface AdminUpdateNotesTabProps {
  updateNotes: UpdateNoteData[];
  onEditNote: (note: UpdateNoteData) => void;
  onDeleteNote: (note: UpdateNoteData) => void;
}

export const AdminUpdateNotesTab: React.FC<AdminUpdateNotesTabProps> = ({
  updateNotes,
  onEditNote,
  onDeleteNote,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 border border-glass bg-theme-sidebar/10 rounded-2xl p-5 shadow-sm">
      {/* Update Notes Table Scroll */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-glass/40">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--glass-border)]">
            <tr className="text-theme-muted text-[10px] font-bold uppercase tracking-wider">
              <th className="px-6 py-3 w-[200px]">Title</th>
              <th className="px-6 py-3 w-[350px]">Content Preview</th>
              <th className="px-6 py-3 w-[150px]">Author</th>
              <th className="px-6 py-3 w-[120px]">Published At</th>
              <th className="px-6 py-3 text-right w-[150px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--glass-border)] text-xs text-theme-primary">
            {updateNotes.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-theme-muted font-semibold"
                >
                  No update notes published yet.
                </td>
              </tr>
            ) : (
              updateNotes.map((note) => (
                <tr
                  key={note.id}
                  className="hover:bg-theme-sidebar/10 transition-colors"
                >
                  <td className="px-6 py-3.5 font-bold truncate">
                    {note.title}
                  </td>
                  <td className="px-6 py-3.5 truncate text-theme-muted font-medium">
                    {note.content.length > 85
                      ? `${note.content.substring(0, 85)}...`
                      : note.content}
                  </td>
                  <td className="px-6 py-3.5 truncate">
                    {note.author?.displayName ||
                      note.author?.username ||
                      note.author?.email ||
                      'System'}
                  </td>
                  <td className="px-6 py-3.5 text-theme-muted">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => onEditNote(note)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold cursor-pointer transition-all border border-indigo-500/20 active-press"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteNote(note)}
                      className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold cursor-pointer transition-all border border-red-500/20 active-press"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
