import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface UpdateNotesTabProps {
  historyLoading: boolean;
  historyNotes: any[];
}

export const UpdateNotesTab: React.FC<UpdateNotesTabProps> = ({
  historyLoading,
  historyNotes,
}) => {
  return (
    <div className="flex flex-col gap-6 flex-1 animate-fade-in overflow-hidden h-full">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-extrabold text-[15px] text-theme-primary">
          Update Notes History
        </h3>
        <span className="text-[11.5px] text-theme-muted">
          View all previous patch logs and platform updates.
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
        {historyLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-theme-secondary" />
            <span className="text-xs text-theme-muted font-bold">
              Loading updates...
            </span>
          </div>
        ) : historyNotes.length === 0 ? (
          <div className="text-center py-12 text-theme-muted font-semibold text-xs border border-glass rounded-xl bg-theme-input/10">
            No update notes available yet.
          </div>
        ) : (
          historyNotes.map((note) => (
            <div
              key={note.id}
              className="glass-panel border border-glass bg-theme-sidebar/5 rounded-xl p-4.5 flex flex-col gap-3 hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-glass pb-2">
                <h4 className="font-bold text-[13px] text-theme-primary">
                  {note.title}
                </h4>
                <span className="text-[10px] text-theme-muted font-semibold shrink-0">
                  {new Date(note.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="markdown-body text-xs text-theme-primary leading-relaxed max-h-[250px] overflow-y-auto pr-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.content}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
