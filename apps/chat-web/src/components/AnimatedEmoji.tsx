import React, { useState, useEffect } from 'react';
import { getAnimatedEmojiUrl } from '../utils/animatedEmoji';

interface AnimatedEmojiProps {
  glyph: string;
  size?: number | string;
  className?: string;
  fallback?: React.ReactNode;
  title?: string;
  /** Duration in ms for the initial playback before freezing (default: 5000ms, like MS Teams) */
  initialPlayDuration?: number;
  /** When true, continuously animates without freezing (ideal for input preview) */
  alwaysAnimate?: boolean;
}

// Global cache of high-resolution static PNG data URLs (256x256 native)
const staticFrameCache = new Map<string, string>();

export const AnimatedEmoji: React.FC<AnimatedEmojiProps> = ({
  glyph,
  size = 72,
  className = '',
  fallback,
  title,
  initialPlayDuration = 5000,
  alwaysAnimate = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitialPlaying, setIsInitialPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [playCount, setPlayCount] = useState(0);

  const animatedUrl = getAnimatedEmojiUrl(glyph);
  const [staticUrl, setStaticUrl] = useState<string | null>(() => {
    return animatedUrl ? staticFrameCache.get(animatedUrl) || null : null;
  });

  const dimension = typeof size === 'number' ? `${size}px` : size;

  // Teams-like behavior: animate for initialPlayDuration (5s) then switch to static frame unless alwaysAnimate is true
  useEffect(() => {
    if (alwaysAnimate) {
      return;
    }

    if (initialPlayDuration <= 0) {
      setIsInitialPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsInitialPlaying(false);
    }, initialPlayDuration);

    return () => clearTimeout(timer);
  }, [alwaysAnimate, initialPlayDuration]);

  // Capture the native full-resolution (256x256) first frame on an offscreen canvas
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    const img = e.currentTarget;

    if (animatedUrl && !staticFrameCache.has(animatedUrl)) {
      try {
        const naturalW = img.naturalWidth || 256;
        const naturalH = img.naturalHeight || 256;
        const offscreen = document.createElement('canvas');
        offscreen.width = naturalW;
        offscreen.height = naturalH;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, naturalW, naturalH);
          const dataUrl = offscreen.toDataURL('image/png');
          staticFrameCache.set(animatedUrl, dataUrl);
          setStaticUrl(dataUrl);
        }
      } catch (err) {
        console.debug('Static frame capture error:', err);
      }
    }
  };

  const defaultFallback = (
    <span
      className={`inline-flex items-center justify-center select-none leading-none ${className}`}
      style={{
        fontSize: dimension,
        lineHeight: 1,
        width: dimension,
        height: dimension,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      title={title || glyph}
    >
      {glyph}
    </span>
  );

  // If no animation exists or loading failed, render fallback unicode emoji
  if (!animatedUrl || hasError) {
    return <>{fallback || defaultFallback}</>;
  }

  // Active animation when alwaysAnimate is true, within the initial 5 seconds, or currently hovered
  const isAnimating = alwaysAnimate || isInitialPlaying || isHovered;

  // When hovering, restart animation from beginning
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!isInitialPlaying) {
      setPlayCount((prev) => prev + 1);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  let currentSrc = animatedUrl;
  if (isAnimating) {
    currentSrc =
      playCount > 0 ? `${animatedUrl}#play-${playCount}` : animatedUrl;
  } else if (staticUrl) {
    currentSrc = staticUrl;
  }

  return (
    <span
      className={`inline-flex items-center justify-center select-none relative align-middle cursor-default ${className}`}
      style={{
        width: dimension,
        height: dimension,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      title={title || glyph}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Fallback while loading */}
      {!isLoaded && (
        <span
          className="absolute inset-0 flex items-center justify-center opacity-40 select-none pointer-events-none"
          style={{
            fontSize: `calc(${dimension} * 0.75)`,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        >
          {glyph}
        </span>
      )}

      {/* Render directly via a single hardware-accelerated <img> element with pointer-events-none to prevent mobile image preview menu */}
      <img
        key={isAnimating ? `anim-${playCount}` : 'static'}
        src={currentSrc}
        alt={glyph}
        crossOrigin="anonymous"
        draggable={false}
        loading="eager"
        decoding="async"
        onLoad={handleLoad}
        onError={() => setHasError(true)}
        className="pointer-events-none select-none"
        style={{
          width: dimension,
          height: dimension,
          objectFit: 'contain',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.12s ease-in-out',
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      />
    </span>
  );
};

export default AnimatedEmoji;
