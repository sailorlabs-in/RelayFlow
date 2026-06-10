import type { AxiosRequestConfig } from 'axios';
import axios from 'axios';

import { API_URL } from '../constants/config';
import { store } from '../store';
import { logoutUser } from '../store/slices/authSlice';

const activeControllers = new Map<string, AbortController>();

const ApiRequest = async (
  url: string,
  method: 'get' | 'post' | 'patch' | 'delete' | 'put',
  data: any = {},
  isUseAccessToken = true,
  signal?: AbortSignal,
): Promise<any> => {
  const reqKey = `${method.toUpperCase()}:${url}`;

  let requestSignal = signal;
  if (method.toLowerCase() === 'get') {
    if (activeControllers.has(reqKey)) {
      const existingController = activeControllers.get(reqKey);
      existingController?.abort();
    }

    const controller = new AbortController();
    activeControllers.set(reqKey, controller);

    requestSignal = signal || controller.signal;
  }

  // Retrieve auth token from state or localStorage
  let token: string | null = null;
  if (isUseAccessToken) {
    const state = store.getState() as { auth: { accessToken: string | null } };
    token = state.auth?.accessToken;
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('chat_token');
    }
  }

  const apiRequestPayload: AxiosRequestConfig = {
    url:
      url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`,
    method,
    data: method.toLowerCase() === 'get' ? undefined : data,
    params: method.toLowerCase() === 'get' ? data : undefined,
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
    responseType: 'json',
    signal: requestSignal,
  };

  try {
    const response = await axios(apiRequestPayload);

    if (method.toLowerCase() === 'get' && activeControllers.has(reqKey)) {
      activeControllers.delete(reqKey);
    }

    return response.data;
  } catch (error: any) {
    if (method.toLowerCase() === 'get' && activeControllers.has(reqKey)) {
      activeControllers.delete(reqKey);
    }

    if (
      axios.isCancel(error) ||
      error.name === 'AbortError' ||
      error.name === 'CanceledError'
    ) {
      throw new Error('Request cancelled');
    }

    // Global response interceptor logic for 401 Unauthorized errors
    if (error.response?.status === 401 && isUseAccessToken) {
      store.dispatch(logoutUser());
    }

    throw error;
  }
};

export default ApiRequest;
