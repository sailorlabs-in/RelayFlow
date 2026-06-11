import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiRequest from '../../utils/ApiRequest';

export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  avatarThumbnailUrl?: string;
  themeMode?: string;
  themeSchema?: string;
  status?: string;
  visibility?: string;
  notificationsEnabled?: boolean;
  notificationsDmEnabled?: boolean;
  notificationsGroupEnabled?: boolean;
  notificationsInAppEnabled?: boolean;
  notificationsFriendRequestEnabled?: boolean;
  isTwoFactorEnabled?: boolean;
  twoFactorOnlyNewDevice?: boolean;
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
  requiresVerification: boolean;
  requires2FA: boolean;
  verificationEmail: string | null;
  temp2FAUserId: string | null;
}

// Check localStorage for cached credentials safely in Next.js client
const isBrowser = typeof window !== 'undefined';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  status: 'idle',
  error: null,
  themeMode: 'system',
  themeSchema: 'arctic_glass',
  requiresVerification: false,
  requires2FA: false,
  verificationEmail: null,
  temp2FAUserId: null,
};

// Async Thunk for User Registration
export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    payload: {
      email: string;
      password: string;
      username: string;
      displayName?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        '/auth/register',
        'post',
        payload,
        false,
      );
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Registration failed. Please try again.';
      return rejectWithValue(errorMsg);
    }
  },
);

// Async Thunk for User Login
export const loginUser = createAsyncThunk(
  'auth/login',
  async (
    payload: { email: string; password: string; deviceId?: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest('/auth/login', 'post', payload, false);
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Login failed. Invalid email or password.';
      return rejectWithValue(errorMsg);
    }
  },
);

// Async Thunk for Verifying Email OTP
export const verifyEmailOtp = createAsyncThunk(
  'auth/verifyEmail',
  async (payload: { email: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        '/auth/verify-email',
        'post',
        payload,
        false,
      );
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Verification failed. Invalid or expired OTP.';
      return rejectWithValue(errorMsg);
    }
  },
);

// Async Thunk for Verifying 2FA OTP
export const verify2FaOtp = createAsyncThunk(
  'auth/verify2Fa',
  async (
    payload: {
      userId: string;
      otp: string;
      deviceId?: string;
      rememberDevice?: boolean;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        '/auth/verify-2fa',
        'post',
        payload,
        false,
      );
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        '2FA verification failed. Invalid or expired OTP.';
      return rejectWithValue(errorMsg);
    }
  },
);

// Async Thunk for Resending Verification Code
export const resendVerificationCode = createAsyncThunk(
  'auth/resendVerification',
  async (payload: { email: string }, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        '/auth/resend-verification',
        'post',
        payload,
        false,
      );
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to resend verification code.';
      return rejectWithValue(errorMsg);
    }
  },
);

// Async Thunk to request a password reset link
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        '/auth/forgot-password',
        'post',
        { email },
        false,
      );
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to request reset link.';
      return rejectWithValue(errorMsg);
    }
  },
);

// Async Thunk to reset password with token
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (payload: { token: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        '/auth/reset-password',
        'post',
        payload,
        false,
      );
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Reset failed. The token is invalid or has expired.';
      return rejectWithValue(errorMsg);
    }
  },
);

// Async Thunk to check username availability
export const checkUsernameAvailability = createAsyncThunk(
  'auth/checkUsername',
  async (username: string, { rejectWithValue }) => {
    try {
      const response = await ApiRequest(
        `/users/check-username?username=${username}`,
        'get',
        {},
        true,
      );
      return response; // returns { available: boolean }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to check username.';
      return rejectWithValue(errorMsg);
    }
  },
);

// Async Thunk for Updating User Profile / Settings
export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (
    payload: {
      displayName?: string;
      username?: string;
      password?: string;
      themeMode?: string;
      themeSchema?: string;
      status?: string;
      visibility?: string;
      notificationsEnabled?: boolean;
      notificationsDmEnabled?: boolean;
      notificationsGroupEnabled?: boolean;
      notificationsInAppEnabled?: boolean;
      notificationsFriendRequestEnabled?: boolean;
      isTwoFactorEnabled?: boolean;
      twoFactorOnlyNewDevice?: boolean;
      avatarUrl?: string;
      avatarThumbnailUrl?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await ApiRequest(
        '/users/profile',
        'patch',
        payload,
        true,
      );
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to update profile settings.';
      return rejectWithValue(errorMsg);
    }
  },
);

// Async Thunk to fetch current user profile
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiRequest('/users/me', 'get', {}, true);
      return response.data;
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to fetch user profile.';
      return rejectWithValue(errorMsg);
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    restoreSession: (state) => {
      if (isBrowser) {
        const token = localStorage.getItem('chat_token');
        const userVal = localStorage.getItem('chat_user');
        const theme = localStorage.getItem('rf-theme') || 'system';
        const schema =
          localStorage.getItem('rf-theme-schema') || 'arctic_glass';

        if (token && userVal) {
          try {
            state.accessToken = token;
            state.user = JSON.parse(userVal);
            state.themeMode = theme as 'dark' | 'light' | 'system';
            state.themeSchema = schema;
            state.status = 'succeeded';
          } catch (_) {
            localStorage.removeItem('chat_token');
            localStorage.removeItem('chat_user');
          }
        }
      }
    },
    logoutUser: (state) => {
      state.user = null;
      state.accessToken = null;
      state.status = 'idle';
      state.error = null;
      state.requiresVerification = false;
      state.requires2FA = false;
      state.verificationEmail = null;
      state.temp2FAUserId = null;
      if (isBrowser) {
        localStorage.removeItem('chat_token');
        localStorage.removeItem('chat_user');
      }
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    cancelVerification: (state) => {
      state.requiresVerification = false;
      state.requires2FA = false;
      state.verificationEmail = null;
      state.temp2FAUserId = null;
      state.error = null;
      state.status = 'idle';
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
            } catch {
              // Ignore invalid cached user data.
            }
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
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        if (action.payload && action.payload.email) {
          state.requiresVerification = true;
          state.verificationEmail = action.payload.email;
        }
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
        state.error = null;

        if (action.payload?.requiresVerification) {
          state.status = 'succeeded';
          state.requiresVerification = true;
          state.verificationEmail = action.payload.email;
        } else if (action.payload?.requires2FA) {
          state.status = 'succeeded';
          state.requires2FA = true;
          state.temp2FAUserId = action.payload.userId;
          state.verificationEmail = action.payload.email;
        } else {
          state.status = 'succeeded';
          state.accessToken = action.payload.accessToken;
          state.user = action.payload.user;

          const userTheme = action.payload.user?.themeMode || 'system';
          const userSchema = action.payload.user?.themeSchema || 'arctic_glass';
          state.themeMode = userTheme;
          state.themeSchema = userSchema;

          if (isBrowser) {
            localStorage.setItem('chat_token', action.payload.accessToken);
            localStorage.setItem(
              'chat_user',
              JSON.stringify(action.payload.user),
            );
            localStorage.setItem('rf-theme', userTheme);
            localStorage.setItem('rf-theme-schema', userSchema);
          }
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // Verify Email
    builder
      .addCase(verifyEmailOtp.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyEmailOtp.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.requiresVerification = false;
        state.verificationEmail = null;
        state.error = null;

        const userTheme = action.payload.user?.themeMode || 'system';
        const userSchema = action.payload.user?.themeSchema || 'arctic_glass';
        state.themeMode = userTheme;
        state.themeSchema = userSchema;

        if (isBrowser) {
          localStorage.setItem('chat_token', action.payload.accessToken);
          localStorage.setItem(
            'chat_user',
            JSON.stringify(action.payload.user),
          );
          localStorage.setItem('rf-theme', userTheme);
          localStorage.setItem('rf-theme-schema', userSchema);
        }
      })
      .addCase(verifyEmailOtp.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });

    // Verify 2FA
    builder
      .addCase(verify2FaOtp.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verify2FaOtp.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.requires2FA = false;
        state.temp2FAUserId = null;
        state.verificationEmail = null;
        state.error = null;

        const userTheme = action.payload.user?.themeMode || 'system';
        const userSchema = action.payload.user?.themeSchema || 'arctic_glass';
        state.themeMode = userTheme;
        state.themeSchema = userSchema;

        if (isBrowser) {
          localStorage.setItem('chat_token', action.payload.accessToken);
          localStorage.setItem(
            'chat_user',
            JSON.stringify(action.payload.user),
          );
          localStorage.setItem('rf-theme', userTheme);
          localStorage.setItem('rf-theme-schema', userSchema);
        }
      })
      .addCase(verify2FaOtp.rejected, (state, action) => {
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

    // Fetch Current User
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        if (isBrowser) {
          localStorage.setItem('chat_user', JSON.stringify(action.payload));
        }
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error =
          (action.payload as string) || 'Failed to fetch current user profile.';
      });
  },
});

export const {
  logoutUser,
  clearAuthError,
  cancelVerification,
  setThemeMode,
  setThemeSchema,
  updateUserStatusOptimistic,
  restoreSession,
} = authSlice.actions;
export default authSlice.reducer;
