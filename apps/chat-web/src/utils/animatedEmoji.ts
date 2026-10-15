import { animatedEmojiMap } from './animatedEmojiMap';

const emojiMap: Record<string, string> = animatedEmojiMap;

// Matches unicode emojis, emoji presentation, and extended pictographic sequences
const EMOJI_REGEX =
  /^(\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\p{Extended_Pictographic})+$/u;

/**
 * Checks if a string consists exclusively of emojis (ignoring whitespace).
 * If it does, returns an array of individual emoji graphemes.
 * If there is any non-emoji text or alphanumeric characters, returns null.
 */
export function getEmojiSegments(str: string): string[] | null {
  if (!str) {
    return null;
  }
  const clean = str.trim();
  if (!clean) {
    return null;
  }

  // Use Intl.Segmenter for grapheme cluster segmentation (handles ZWJ, skin tones, flags)
  let segments: string[] = [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    segments = [...segmenter.segment(clean)]
      .map((s) => s.segment)
      .filter((s) => s.trim().length > 0);
  } else {
    // Fallback if Intl.Segmenter is unavailable
    segments = Array.from(clean).filter((s) => s.trim().length > 0);
  }

  if (segments.length === 0) {
    return null;
  }

  for (const s of segments) {
    if (!EMOJI_REGEX.test(s) || /[a-zA-Z0-9]/.test(s)) {
      return null;
    }
  }

  return segments;
}

/**
 * Returns true if the string is exclusively 1 or 2 emojis.
 */
export function is1Or2Emojis(str: string): boolean {
  const segments = getEmojiSegments(str);
  return Boolean(segments && segments.length >= 1 && segments.length <= 2);
}

/**
 * Resolves the animated PNG asset URL from the user's private media bucket
 * (or fallback CDN) for a given emoji glyph.
 */
export function getAnimatedEmojiUrl(glyph: string): string | null {
  if (!glyph) {
    return null;
  }

  const directPath = emojiMap[glyph] || emojiMap[glyph.replace(/\uFE0F/g, '')];
  if (!directPath) {
    return null;
  }

  // If already full URL:
  if (directPath.startsWith('http://') || directPath.startsWith('https://')) {
    return directPath;
  }

  // Direct bucket filename (e.g. "Fire.png", "Writing Hand Dark Skin Tone.png"):
  if (!directPath.includes('/')) {
    const bucketBase = (
      process.env.NEXT_PUBLIC_BUCKET_URL || 'https://bucket.umangsailor.com'
    ).replace(/\/+$/, '');
    return `${bucketBase}/storage/animated-emoji/${encodeURIComponent(directPath)}`;
  }

  // Optional custom base URL override via environment variable
  if (process.env.NEXT_PUBLIC_ANIMATED_EMOJI_URL) {
    const base = process.env.NEXT_PUBLIC_ANIMATED_EMOJI_URL.replace(/\/+$/, '');
    return `${base}/${encodeURI(directPath)}`;
  }

  // Fallback to official Microsoft CDN if relative path with folders
  return `https://media.githubusercontent.com/media/microsoft/fluentui-emoji-animated/main/${encodeURI(directPath)}`;
}

/**
 * Checks whether an animated version of this emoji exists in the Microsoft Animated UI dataset.
 */
export function hasAnimatedEmoji(glyph: string): boolean {
  return Boolean(getAnimatedEmojiUrl(glyph));
}
