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
