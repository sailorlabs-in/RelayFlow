import React, { useState } from 'react';
import { getAnimatedEmojiUrl } from '../utils/animatedEmoji';

interface AnimatedEmojiProps {
  glyph: string;
  size?: number | string;
  className?: string;
  fallback?: React.ReactNode;
  title?: string;
}

export const AnimatedEmoji: React.FC<AnimatedEmojiProps> = ({
  glyph,
  size = 72,
  className = '',
  fallback,
  title,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const animatedUrl = getAnimatedEmojiUrl(glyph);
  const dimension = typeof size === 'number' ? `${size}px` : size;

  const defaultFallback = (
    <span
      className={`inline-flex items-center justify-center select-all leading-none ${className}`}
      style={{
        fontSize: dimension,
        lineHeight: 1,
        width: dimension,
        height: dimension,
      }}
      title={title || glyph}
    >
      {glyph}
    </span>
  );

  // If no animation exists in Microsoft Fluent UI dataset or loading failed, render fallback
  if (!animatedUrl || hasError) {
    return <>{fallback || defaultFallback}</>;
  }

  return (
    <span
      className={`inline-flex items-center justify-center select-none relative align-middle ${className}`}
      style={{
        width: dimension,
        height: dimension,
      }}
      title={title || glyph}
    >
      {!isLoaded && (
        <span
          className="absolute inset-0 flex items-center justify-center opacity-40 select-all"
          style={{ fontSize: `calc(${dimension} * 0.75)` }}
        >
          {glyph}
        </span>
      )}
      <img
        src={animatedUrl}
        alt={glyph}
        draggable={false}
        loading="eager"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{
          width: dimension,
          height: dimension,
          objectFit: 'contain',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.18s ease-in-out',
        }}
      />
    </span>
  );
};

export default AnimatedEmoji;
