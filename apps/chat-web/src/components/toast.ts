import type { ToastOptions } from 'react-toastify';
import { toast } from 'react-toastify';

/**
 * Returns the currently active theme ('light' or 'dark') by querying the HTML element's attributes
 * or checking media queries for system preference.
 */
export const getActiveTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') {return 'dark';}
  
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'light' ? 'light' : 'dark';
};

export const showToast = {
  success: (msg: React.ReactNode, options?: ToastOptions) => {
    return toast.success(msg as any, { theme: getActiveTheme(), ...options });
  },
  error: (msg: React.ReactNode, options?: ToastOptions) => {
    if (typeof msg === 'string') {
      const lowerMsg = msg.toLowerCase();
      if (
        lowerMsg.includes('expired') ||
        lowerMsg.includes('unauthorized') ||
        lowerMsg.includes('token') ||
        lowerMsg.includes('session')
      ) {
        return;
      }
    }
    return toast.error(msg as any, { theme: getActiveTheme(), ...options });
  },
  info: (msg: React.ReactNode, options?: ToastOptions) => {
    return toast.info(msg as any, { theme: getActiveTheme(), ...options });
  },
  warning: (msg: React.ReactNode, options?: ToastOptions) => {
    return toast.warn(msg as any, { theme: getActiveTheme(), ...options });
  },
  /** Custom notification toast — no Toastify theme applied so CSS variables control all colors */
  notification: (msg: React.ReactNode, options?: ToastOptions) => {
    return toast(msg as any, { ...options });
  },
};

