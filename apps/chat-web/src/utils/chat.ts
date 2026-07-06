export const stripMarkdown = (text: string): string => {
  if (!text) {
    return '';
  }
  return text
    .replace(/^#+\s+/gm, '') // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/__([^_]+)__/g, '$1') // bold _
    .replace(/_([^_]+)_/g, '$1') // italic _
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // links
    .replace(/^\s*[-*+]\s+/gm, '') // list markers
    .replace(/^\s*\d+\.\s+/gm, '') // numbered list markers
    .trim();
};

export const formatLastMessagePreview = (
  lastMsg: any,
  currentUserId: string,
): string => {
  if (!lastMsg) {
    return 'No messages yet';
  }

  let text = lastMsg.content || '';
  if (text) {
    text = stripMarkdown(text);
  } else if (lastMsg.media && lastMsg.media.length > 0) {
    const type = lastMsg.media[0].type || '';
    if (type.startsWith('image/')) {
      text = '📷 Photo';
    } else if (type.startsWith('video/')) {
      text = '🎥 Video';
    } else {
      text = '📁 Attachment';
    }
  } else {
    text = '📁 Attachment';
  }

  if (lastMsg.senderId === currentUserId) {
    return `You: ${text}`;
  }
  return text;
};
