// User idle inactivity threshold: 2 minutes
export const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;

// User auto-offline threshold (after staying away): 10 minutes
export const AUTO_OFFLINE_TIMEOUT_MS = 10 * 60 * 1000;

export const PRESENCE_DOT_COLORS = {
  online: '#22c55e', // green
  away: '#eab308', // amber
  dnd: '#ef4444', // red
  offline: '#8e9bae', // gray
};

// 1-on-1 Conversation Auto-Deletion Policies
export const MEDIA_RETENTION_DAYS_OPTIONS = [15, 30, 60, 90] as const;
export const MESSAGE_RETENTION_DAYS_OPTIONS = [
  15, 30, 45, 60, 90, 180, 0,
] as const; // 0 = Infinity (Never delete)
export const DEFAULT_MEDIA_RETENTION_DAYS = 30;
export const DEFAULT_MESSAGE_RETENTION_DAYS = 90;
