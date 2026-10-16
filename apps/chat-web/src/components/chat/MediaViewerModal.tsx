import React, { useEffect, useState } from 'react';
import type { MessageMediaItem } from '../../store/slices/chatSlice';
import { IconX } from '../Icons';

interface MediaViewerModalProps {
  activeMediaItem: MessageMediaItem | null;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  activeMediaItem,
  onClose,
}) => {
  const [mediaLoadError, setMediaLoadError] = useState(false);

  useEffect(() => {
    setMediaLoadError(false);
  }, [activeMediaItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!activeMediaItem) {
    return null;
  }

  const isImage = activeMediaItem.type.startsWith('image/');
  const isVideo = activeMediaItem.type.startsWith('video/');

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-[92vw] max-h-[88vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute -top-12 right-0 bg-white/10 hover:bg-white/25 text-white rounded-full p-2 hover:scale-105 active:scale-95 transition-all border-none cursor-pointer flex items-center justify-center shadow-lg"
          onClick={onClose}
          title="Close viewer (Esc)"
        >
          <IconX size={20} />
        </button>

        {/* Expired / Fallback Notice Banner */}
        {(activeMediaItem.isExpired || mediaLoadError) && (
          <div className="mb-3 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 backdrop-blur-md shadow-lg">
            <span className="text-sm">⏱️</span>
            <span>
              Original media expired according to chat retention policy •
              Displaying thumbnail
            </span>
          </div>
        )}

        {/* Media rendering */}
        {isImage && (
          <img
            src={
              (activeMediaItem.isExpired || mediaLoadError) &&
              activeMediaItem.thumbnailUrl
                ? activeMediaItem.thumbnailUrl
                : activeMediaItem.url
            }
            alt={activeMediaItem.name}
            onError={() => {
              if (!mediaLoadError && activeMediaItem.thumbnailUrl) {
                setMediaLoadError(true);
              }
            }}
            className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
          />
        )}

        {isVideo &&
          ((activeMediaItem.isExpired || mediaLoadError) &&
          activeMediaItem.thumbnailUrl ? (
            <div className="relative flex flex-col items-center">
              <img
                src={activeMediaItem.thumbnailUrl}
                alt={activeMediaItem.name}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl backdrop-blur-xs">
                <div className="px-4 py-2 rounded-xl bg-black/75 text-white text-xs font-semibold flex items-center gap-2 border border-white/10 shadow-lg">
                  <span>🎬</span>
                  <span>Original video expired (Thumbnail preview only)</span>
                </div>
              </div>
            </div>
          ) : (
            <video
              src={activeMediaItem.url}
              controls
              autoPlay
              onError={() => {
                if (!mediaLoadError && activeMediaItem.thumbnailUrl) {
                  setMediaLoadError(true);
                }
              }}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          ))}

        {/* Title / details */}
        <div className="mt-4 text-center text-white px-4 max-w-lg flex flex-col items-center">
          <h4 className="text-[15px] font-bold truncate max-w-full">
            {activeMediaItem.name}
          </h4>
          <p className="text-[12px] text-white/60 mt-1">
            {(activeMediaItem.size / (1024 * 1024)).toFixed(2)} MB
            {(activeMediaItem.isExpired || mediaLoadError) &&
              ' • Thumbnail Preview'}
          </p>
        </div>
      </div>
    </div>
  );
};
