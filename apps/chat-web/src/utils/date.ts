/**
 * Formats a message's creation timestamp.
 * - If today: "Today h:mm AM/PM"
 * - If yesterday: "Yesterday h:mm AM/PM"
 * - Otherwise: "DD/MM/YYYY h:mm AM/PM"
 */
export const formatMessageTimestamp = (
  dateInput: string | Date | number,
  timeFormat: '12h' | '24h' = '12h',
): string => {
  const date = new Date(dateInput);

  const timeStr = date.toLocaleTimeString([], {
    hour: timeFormat === '24h' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: timeFormat !== '24h',
  });

  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return `Today ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday ${timeStr}`;
  } else {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    return `${dateStr} ${timeStr}`;
  }
};

export const formatReadAtTimestamp = (
  dateInput: string | Date | number,
  timeFormat: '12h' | '24h' = '12h',
): string => {
  const date = new Date(dateInput);

  const timeStr = date.toLocaleTimeString([], {
    hour: timeFormat === '24h' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: timeFormat !== '24h',
  });

  const now = new Date();

  // Normalize dates to midnight to do proper day-difference checks
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = dNow.getTime() - dDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return timeStr; // sameday no date
  } else if (diffDays === 1) {
    return `Yesterday ${timeStr}`;
  } else if (diffDays === 2) {
    return `Day before yesterday ${timeStr}`; // 1daybefore yesterday
  } else {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    return `${dateStr} ${timeStr}`;
  }
};
