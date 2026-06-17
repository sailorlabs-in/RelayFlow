/**
 * Formats a message's creation timestamp.
 * - If today: "Today h:mm AM/PM"
 * - If yesterday: "Yesterday h:mm AM/PM"
 * - Otherwise: "DD/MM/YYYY h:mm AM/PM"
 */
export const formatMessageTimestamp = (
  dateInput: string | Date | number,
): string => {
  const date = new Date(dateInput);

  const timeStr = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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
