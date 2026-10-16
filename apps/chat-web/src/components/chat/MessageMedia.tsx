import React from 'react';
import type { Message, MessageMediaItem } from '../../store/slices/chatSlice';

interface MessageMediaProps {
  msg: Message;
  onMediaClick: (item: MessageMediaItem) => void;
}

export const MessageMedia: React.FC<MessageMediaProps> = ({
  msg,
  onMediaClick,
}) => {
  const mediaItems: MessageMediaItem[] = msg.media || [];

  if (mediaItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-col gap-2 max-w-full">
      {mediaItems.map((item, idx) => {
        const isImage = item.type?.startsWith('image/');
        const isVideo = item.type?.startsWith('video/');

        if (isImage) {
          const displayUrl = item.thumbnailUrl || item.url;
          return (
            <div
              key={idx}
              className="mt-1 max-w-full w-fit rounded-xl overflow-hidden border border-glass bg-theme-input/50 hover:border-(--accent-primary)/50 hover:shadow-lg transition-all duration-200 h-[240px] max-w-[360px] relative group"
            >
              <img
                src={displayUrl}
                alt={item.name || 'Image'}
                className="h-full w-auto max-w-full max-w-[360px] object-cover cursor-pointer group-hover:scale-[1.02] transition-transform duration-200"
                onClick={() => onMediaClick(item)}
              />
              {item.isExpired && (
                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 shadow-sm pointer-events-none">
                  <span>⏱️</span>
                  <span>Thumbnail Kept</span>
                </div>
              )}
            </div>
          );
        }

        if (isVideo) {
          const displayUrl = item.thumbnailUrl || item.url;
          return (
            <div
              key={idx}
              className="mt-1 max-w-full w-fit rounded-xl overflow-hidden border border-glass bg-theme-input/50 hover:border-(--accent-primary)/50 hover:shadow-lg relative cursor-pointer group h-[240px] max-w-[360px] transition-all duration-200"
              onClick={() => onMediaClick(item)}
            >
              {item.thumbnailUrl ? (
                <div className="relative h-full w-fit">
                  <img
                    src={displayUrl}
                    alt={item.name || 'Video'}
                    className="h-full w-auto max-w-full max-w-[360px] object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors duration-150">
                    <div className="w-12 h-12 rounded-full bg-white/95 dark:bg-zinc-900/90 backdrop-blur-sm flex items-center justify-center text-black dark:text-white shadow-xl group-hover:scale-110 active:scale-95 transition-all duration-150">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 ml-0.5 text-(--accent-primary)"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <video
                  src={item.url}
                  className="h-full w-auto max-w-full max-w-[360px] object-cover"
                  preload="metadata"
                />
              )}
              {item.isExpired && (
                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 shadow-sm pointer-events-none">
                  <span>⏱️</span>
                  <span>Thumbnail Kept</span>
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={idx}
            className="mt-1 flex items-center gap-3 p-3 rounded-xl border border-glass bg-theme-input/70 hover:bg-theme-input max-w-sm text-[13px] text-left transition-colors"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-(--accent-primary) text-white text-[16px] shrink-0 shadow-sm">
              📁
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="font-semibold truncate text-theme-primary text-[13.5px]">
                {item.name || 'Attachment'}
              </div>
              {item.isExpired ? (
                <div className="text-[11px] text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                  <span>⏱️</span> Expired file
                </div>
              ) : (
                <div className="text-[11px] text-theme-muted mt-0.5">
                  {item.size
                    ? `${(item.size / 1024).toFixed(1)} KB`
                    : 'Unknown size'}
                </div>
              )}
            </div>
            {!item.isExpired && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-(--theme-btn) text-theme-secondary hover:text-theme-primary hover:bg-(--theme-btn-hover) shrink-0 flex items-center justify-center active-press transition-colors"
                title="Download file"
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-4 h-4"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
};
