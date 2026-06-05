const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4001/api';
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    const { protocol, host } = window.location;
    return `${protocol}//${host}/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
};

const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4001/chat';
    }
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
      return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    const { protocol, host } = window.location;
    return `${protocol}//${host}/chat`;
  }
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001/chat';
};

export const API_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();
