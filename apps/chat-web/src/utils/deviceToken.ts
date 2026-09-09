/**
 * LocalStorage key for the persistent device token / identifier.
 */
export const DEVICE_TOKEN_KEY = 'rf_device_id';

/**
 * Retrieves the device token from localStorage.
 * - If it already exists in localStorage, returns that exact token (never generates a new one).
 * - If it does not exist in localStorage, generates a new unique token, stores it in localStorage, and returns it.
 */
export function getOrCreateDeviceToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    let token = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token || token.trim() === '') {
      const randomPart = Math.random().toString(36).substring(2, 12);
      const timePart = Date.now().toString(36);
      token = `rf_dev_${randomPart}${timePart}`;
      localStorage.setItem(DEVICE_TOKEN_KEY, token);
    }
    return token;
  } catch (err) {
    console.error('Failed to access localStorage for device token:', err);
    return 'rf_dev_fallback';
  }
}

/**
 * Returns the existing device token from localStorage without generating a new one.
 */
export function getExistingDeviceToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
}
