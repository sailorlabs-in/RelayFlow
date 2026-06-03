import axios from 'axios';
import { store } from './index';
import { logoutUser } from './slices/authSlice';

// Global response interceptor to handle 401 Unauthorized errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and user settings from Redux store & localStorage
      store.dispatch(logoutUser());
    }
    return Promise.reject(error);
  }
);
