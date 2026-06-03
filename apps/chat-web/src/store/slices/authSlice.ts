import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Backend API URL based on NestJS Gateway
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  themeMode?: string;
  themeSchema?: string;
  status?: string;
  visibility?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  themeMode: 'dark' | 'light' | 'system';
  themeSchema: string;
}

// Check localStorage for cached credentials safely in Next.js client
const isBrowser = typeof window !== 'undefined';
const initialToken = isBrowser ? localStorage.getItem('chat_token') : null;
const initialUser = isBrowser ? localStorage.getItem('chat_user') : null;
const initialTheme = isBrowser ? (localStorage.getItem('rf-theme') || 'system') : 'system';
const initialSchema = isBrowser ? (localStorage.getItem('rf-theme-schema') || 'arctic_glass') : 'arctic_glass';

const initialState: AuthState = {
  user: initialUser ? JSON.parse(initialUser) : null,
  accessToken: initialToken,
  status: 'idle',
  error: null,
  themeMode: initialTheme as 'dark' | 'light' | 'system',
  themeSchema: initialSchema,
};

// Async Thunk for User Registration
export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    payload: { email: string; password: string; displayName?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, payload);
      // NestJS wraps response in { success: true, data: ... }
      return response.data.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Registration failed. Please try again.';
      return rejectWithValue(errorMsg);
    }
  }
);

// Async Thunk for User Login
export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, payload);
      // NestJS wraps response in { success: true, data: { accessToken, user } }
      return response.data.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Login failed. Invalid email or password.';
      return rejectWithValue(errorMsg);
    }
  }
);

// Async Thunk for Updating User Profile / Settings
export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (
    payload: {
      displayName?: string;
      password?: string;
      themeMode?: string;
      themeSchema?: string;
      status?: string;
      visibility?: string;
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { auth: { accessToken: string | null } };
      const response = await axios.patch(
        `${API_URL}/users/profile`,
        payload,
        {
          headers: {
            Authorization: state.auth.accessToken ? `Bearer ${state.auth.accessToken}` : '',
          },
        }
      );
      // NestJS wraps response in { success: true, data: user }
      return response.data.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to update profile settings.';
      return rejectWithValue(errorMsg);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.accessToken = null;
      state.status = 'idle';
      state.error = null;
      state.themeMode = 'system';
      state.themeSchema = 'arctic_glass';
      if (isBrowser) {
        localStorage.removeItem('chat_token');
        localStorage.removeItem('chat_user');
        localStorage.setItem('rf-theme', 'system');
        localStorage.setItem('rf-theme-schema', 'arctic_glass');
      }
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    setThemeMode: (state, action) => {
      state.themeMode = action.payload;
      if (isBrowser) {
        localStorage.setItem('rf-theme', action.payload);
      }
    },
    setThemeSchema: (state, action) => {
      state.themeSchema = action.payload;
      if (isBrowser) {
        localStorage.setItem('rf-theme-schema', action.payload);
      }
    },
    updateUserStatusOptimistic: (state, action) => {
      if (state.user) {
        state.user.status = action.payload;
        if (isBrowser) {
          const cachedUser = localStorage.getItem('chat_user');
          if (cachedUser) {
            try {
              const u = JSON.parse(cachedUser);
              u.status = action.payload;
              localStorage.setItem('chat_user', JSON.stringify(u));
            } catch (_) {}
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.error = null;
        
        const userTheme = action.payload.user?.themeMode || 'system';
        const userSchema = action.payload.user?.themeSchema || 'arctic_glass';
        state.themeMode = userTheme;
        state.themeSchema = userSchema;

        if (isBrowser) {
          localStorage.setItem('chat_token', action.payload.accessToken);
          localStorage.setItem('chat_user', JSON.stringify(action.payload.user));
          localStorage.setItem('rf-theme', userTheme);
          localStorage.setItem('rf-theme-schema', userSchema);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // Update Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.error = null;

        const userTheme = action.payload?.themeMode || state.themeMode;
        const userSchema = action.payload?.themeSchema || state.themeSchema;
        state.themeMode = userTheme;
        state.themeSchema = userSchema;

        if (isBrowser) {
          localStorage.setItem('chat_user', JSON.stringify(action.payload));
          localStorage.setItem('rf-theme', userTheme);
          localStorage.setItem('rf-theme-schema', userSchema);
        }
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { logoutUser, clearAuthError, setThemeMode, setThemeSchema, updateUserStatusOptimistic } = authSlice.actions;
export default authSlice.reducer;
