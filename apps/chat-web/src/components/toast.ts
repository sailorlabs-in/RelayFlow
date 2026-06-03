import { toast, ToastOptions } from 'react-toastify';

/**
 * Returns the currently active theme ('light' or 'dark') by querying the HTML element's attributes
 * or checking media queries for system preference.
 */
export const getActiveTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';
  
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'light' ? 'light' : 'dark';
};

export const showToast = {
  success: (msg: string, options?: ToastOptions) => {
    return toast.success(msg, { theme: getActiveTheme(), ...options });
  },
  error: (msg: string, options?: ToastOptions) => {
    return toast.error(msg, { theme: getActiveTheme(), ...options });
  },
  info: (msg: string, options?: ToastOptions) => {
    return toast.info(msg, { theme: getActiveTheme(), ...options });
  },
  warning: (msg: string, options?: ToastOptions) => {
    return toast.warn(msg, { theme: getActiveTheme(), ...options });
  },
};
