'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../constants/config';
import { useAppDispatch, useAppSelector } from '../store';
import {
  loginUser,
  registerUser,
  verifyEmailOtp,
  verify2FaOtp,
  resendVerificationCode,
  clearAuthError,
  cancelVerification,
  setThemeMode,
} from '../store/slices/authSlice';

import {
  IconBolt,
  IconZap,
  IconShield,
  IconGlobe,
  IconAlertCircle,
  IconEye,
  IconEyeOff,
} from './Icons';
import type { Theme } from './ThemeSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { showToast } from './toast';

// ── LOGIN FORM COMPONENT ──────────────────────────────────────────────────────
interface LoginFormProps {
  prefilledEmail: string;
  onSwitchToSignUp: () => void;
  onSwitchToForgotPassword: () => void;
  deviceId: string;
}

const LoginForm = ({
  prefilledEmail,
  onSwitchToSignUp,
  onSwitchToForgotPassword,
  deviceId,
}: LoginFormProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { status: authStatus, error: authError } = useAppSelector(
    (s) => s.auth,
  );

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(prefilledEmail);
  }, [prefilledEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    dispatch(loginUser({ email, password, deviceId }));
  };

  const error = localError || authError;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-tight mb-2 text-[var(--text-primary)]">
          Welcome back
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          Enter your credentials to open your workspace.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13.5px] animate-fade-in bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)]">
          <IconAlertCircle />
          {error}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className="input-base rounded-[10px] px-4 py-3 text-[14.5px] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Password
            </label>
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-[11.5px] font-semibold cursor-pointer text-[var(--accent-primary)] bg-transparent border-none active-press hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative flex items-center">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              className="input-base w-full rounded-[10px] pl-4 pr-10 py-3 text-[14.5px] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 cursor-pointer transition-colors duration-200 bg-transparent border-none text-[var(--text-muted)]"
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
        </div>

        <button
          id="auth-submit-btn"
          type="submit"
          disabled={authStatus === 'loading'}
          className="mt-2 rounded-[10px] py-3.5 text-[15px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden btn-send hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)] active-press"
        >
          {authStatus === 'loading' ? 'Processing…' : 'Sign In'}
        </button>
      </form>

      <div className="text-center mt-6 text-[14px] text-[var(--text-secondary)]">
        Don't have an account?
        <button
          id="auth-toggle-btn"
          className="ml-1.5 font-semibold cursor-pointer transition-colors duration-200 text-[var(--accent-primary)] bg-transparent border-none active-press"
          onClick={onSwitchToSignUp}
        >
          Create account
        </button>
      </div>
    </div>
  );
};

// ── SIGN UP FORM COMPONENT ────────────────────────────────────────────────────
interface SignUpFormProps {
  onSwitchToSignIn: (prefilledEmail?: string) => void;
}

const SignUpForm = ({
  onSwitchToSignIn,
}: SignUpFormProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { status: authStatus, error: authError } = useAppSelector(
    (s) => s.auth,
  );

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (username.trim().length < 3) {
      setLocalError('Username must be at least 3 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setLocalError(
        'Username can only contain alphanumeric characters, underscores, and hyphens.',
      );
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    dispatch(
      registerUser({
        email,
        password,
        username: username.toLowerCase().trim(),
        displayName,
      }),
    )
      .unwrap()
      .then(() => {
        showToast.success('Account created! Code sent.');
      })
      .catch(() => {
        // Redux stores the error globally as authError
      });
  };

  const error = localError || authError;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-tight mb-2 text-[var(--text-primary)]">
          Create account
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          Register a profile to start instant messaging.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13.5px] animate-fade-in bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)]">
          <IconAlertCircle />
          {error}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Display Name
          </label>
          <input
            id="auth-display-name"
            type="text"
            className="input-base rounded-[10px] px-4 py-3 text-[14.5px] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
            placeholder="e.g. Umang"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Username
          </label>
          <input
            id="auth-username"
            type="text"
            className="input-base rounded-[10px] px-4 py-3 text-[14.5px] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
            placeholder="e.g. umang"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className="input-base rounded-[10px] px-4 py-3 text-[14.5px] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Password
          </label>
          <div className="relative flex items-center">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              className="input-base w-full rounded-[10px] pl-4 pr-10 py-3 text-[14.5px] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 cursor-pointer transition-colors duration-200 bg-transparent border-none text-[var(--text-muted)]"
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Confirm Password
          </label>
          <div className="relative flex items-center">
            <input
              id="auth-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className="input-base w-full rounded-[10px] pl-4 pr-10 py-3 text-[14.5px] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 cursor-pointer transition-colors duration-200 bg-transparent border-none text-[var(--text-muted)]"
            >
              {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
        </div>

        <button
          id="auth-submit-btn"
          type="submit"
          disabled={authStatus === 'loading'}
          className="mt-2 rounded-[10px] py-3.5 text-[15px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden btn-send hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)] active-press"
        >
          {authStatus === 'loading' ? 'Processing…' : 'Sign Up'}
        </button>
      </form>

      <div className="text-center mt-6 text-[14px] text-[var(--text-secondary)]">
        Already registered?
        <button
          id="auth-toggle-btn"
          className="ml-1.5 font-semibold cursor-pointer transition-colors duration-200 text-[var(--accent-primary)] bg-transparent border-none active-press"
          onClick={() => onSwitchToSignIn()}
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

// ── VERIFY EMAIL OTP FORM COMPONENT ──────────────────────────────────────────
interface VerifyEmailFormProps {
  email: string;
  onCancel: () => void;
}

const VerifyEmailForm = ({
  email,
  onCancel,
}: VerifyEmailFormProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { status: authStatus, error: authError } = useAppSelector(
    (s) => s.auth,
  );
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>(
    'idle',
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setLocalError('Please enter a valid 6-digit code.');
      return;
    }
    dispatch(verifyEmailOtp({ email, otp }));
  };

  const handleResend = () => {
    setResendStatus('sending');
    dispatch(resendVerificationCode({ email }))
      .unwrap()
      .then(() => {
        setResendStatus('sent');
        showToast.success(
          'A new verification code has been sent to your email.',
        );
        setTimeout(() => setResendStatus('idle'), 5000);
      })
      .catch((err) => {
        setResendStatus('idle');
        setLocalError(err || 'Failed to resend verification code.');
      });
  };

  const error = localError || authError;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-tight mb-2 text-[var(--text-primary)]">
          Verify email
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          We sent a 6-digit OTP to <strong>{email}</strong>. Enter it below
          within 24 hours or the account will be deleted.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13.5px] animate-fade-in bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)]">
          <IconAlertCircle />
          {error}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Verification OTP
          </label>
          <input
            type="text"
            maxLength={6}
            className="input-base rounded-[10px] px-4 py-3 text-[18px] tracking-[4px] text-center font-bold focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>

        <button
          type="submit"
          disabled={authStatus === 'loading'}
          className="mt-2 rounded-[10px] py-3.5 text-[15px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden btn-send hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)] active-press"
        >
          {authStatus === 'loading' ? 'Verifying…' : 'Verify Account'}
        </button>
      </form>

      <div className="flex justify-between items-center mt-6 text-[14px]">
        <button
          className="font-semibold cursor-pointer transition-colors duration-200 text-[var(--text-muted)] bg-transparent border-none active-press hover:text-[var(--text-primary)]"
          onClick={onCancel}
        >
          Back to Login
        </button>

        <button
          className="font-semibold cursor-pointer transition-colors duration-200 text-[var(--accent-primary)] bg-transparent border-none active-press disabled:opacity-50"
          onClick={handleResend}
          disabled={resendStatus !== 'idle'}
        >
          {resendStatus === 'sending'
            ? 'Sending...'
            : resendStatus === 'sent'
              ? 'Sent!'
              : 'Resend Code'}
        </button>
      </div>
    </div>
  );
};

// ── VERIFY 2FA OTP FORM COMPONENT ────────────────────────────────────────────
interface TwoFactorFormProps {
  userId: string;
  email: string;
  deviceId: string;
  onCancel: () => void;
}

const TwoFactorForm = ({
  userId,
  email,
  deviceId,
  onCancel,
}: TwoFactorFormProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { status: authStatus, error: authError } = useAppSelector(
    (s) => s.auth,
  );
  const [otp, setOtp] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setLocalError('Please enter a valid 6-digit code.');
      return;
    }
    dispatch(verify2FaOtp({ userId, otp, deviceId, rememberDevice }));
  };

  const error = localError || authError;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-tight mb-2 text-[var(--text-primary)]">
          2FA Check
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          Enter the security verification code sent to your email{' '}
          <strong>{email}</strong>.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13.5px] animate-fade-in bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)]">
          <IconAlertCircle />
          {error}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            2FA Security Code
          </label>
          <input
            type="text"
            maxLength={6}
            className="input-base rounded-[10px] px-4 py-3 text-[18px] tracking-[4px] text-center font-bold focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>

        <div className="flex items-center gap-2 my-1.5 select-none cursor-pointer">
          <input
            id="remember-device-checkbox"
            type="checkbox"
            className="w-4 h-4 rounded border-[var(--glass-border)] text-[var(--accent-primary)] focus:ring-[var(--accent-ring)] cursor-pointer"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
          />
          <label
            htmlFor="remember-device-checkbox"
            className="text-[13px] text-[var(--text-secondary)] cursor-pointer ml-1"
          >
            Remember this device for future logins
          </label>
        </div>

        <button
          type="submit"
          disabled={authStatus === 'loading'}
          className="mt-2 rounded-[10px] py-3.5 text-[15px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden btn-send hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)] active-press"
        >
          {authStatus === 'loading' ? 'Verifying…' : 'Verify Code'}
        </button>
      </form>

      <div className="mt-6 text-[14px]">
        <button
          className="font-semibold cursor-pointer transition-colors duration-200 text-[var(--text-muted)] bg-transparent border-none active-press hover:text-[var(--text-primary)]"
          onClick={onCancel}
        >
          Cancel Login
        </button>
      </div>
    </div>
  );
};

// ── FORGOT PASSWORD FORM COMPONENT ───────────────────────────────────────────
interface ForgotPasswordFormProps {
  onCancel: () => void;
}

const ForgotPasswordForm = ({
  onCancel,
}: ForgotPasswordFormProps): React.JSX.Element => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'failed'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError(null);

    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setStatus('success');
      showToast.success('Password reset link sent!');
    } catch (err: any) {
      setStatus('failed');
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to request reset link.';
      setError(errorMsg);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-tight mb-2 text-[var(--text-primary)]">
          Reset password
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          Provide your email and we'll mail you a reset link (expires in 30
          mins).
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13.5px] animate-fade-in bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)]">
          <IconAlertCircle />
          {error}
        </div>
      )}

      {status === 'success' ? (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="rounded-xl px-4 py-3 bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-emerald-600 text-[13.5px] leading-relaxed">
            ✔ If the email is registered in our database, we sent a password
            reset link to it. Please check your inbox (and spam folder).
          </div>
          <button
            onClick={onCancel}
            className="mt-2 rounded-[10px] py-3.5 text-[15px] font-semibold text-white cursor-pointer transition-all duration-200 relative overflow-hidden btn-send hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)] active-press"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Email
            </label>
            <input
              type="email"
              className="input-base rounded-[10px] px-4 py-3 text-[14.5px] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-2 rounded-[10px] py-3.5 text-[15px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden btn-send hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)] active-press"
          >
            {status === 'loading' ? 'Sending…' : 'Send Reset Link'}
          </button>

          <button
            type="button"
            className="mt-2 text-[14.5px] font-semibold cursor-pointer transition-colors duration-200 text-[var(--text-muted)] bg-transparent border-none active-press hover:text-[var(--text-primary)]"
            onClick={onCancel}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
};

// ── RESET PASSWORD FORM COMPONENT ───────────────────────────────────────────
interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

const ResetPasswordForm = ({
  token,
  onSuccess,
}: ResetPasswordFormProps): React.JSX.Element => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'failed'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('loading');

    try {
      await axios.post(`${API_URL}/auth/reset-password`, { token, password });
      setStatus('success');
      showToast.success('Password updated successfully!');
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err: any) {
      setStatus('failed');
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Reset failed. The token is invalid or has expired.';
      setError(errorMsg);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-tight mb-2 text-[var(--text-primary)]">
          Choose a new password
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          Please enter and confirm your new password below.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13.5px] animate-fade-in bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)]">
          <IconAlertCircle />
          {error}
        </div>
      )}

      {status === 'success' ? (
        <div className="rounded-xl px-4 py-3 bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-emerald-600 text-[13.5px] leading-relaxed animate-fade-in">
          ✔ Password updated! Redirecting to sign in page...
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              New Password
            </label>
            <input
              type="password"
              className="input-base rounded-[10px] px-4 py-3 text-[14.5px] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Confirm Password
            </label>
            <input
              type="password"
              className="input-base rounded-[10px] px-4 py-3 text-[14.5px] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-2 rounded-[10px] py-3.5 text-[15px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden btn-send hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)] active-press"
          >
            {status === 'loading' ? 'Saving…' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
};

// ── AUTH GATE CONTAINER ───────────────────────────────────────────────────────
export const AuthGate = (): React.JSX.Element => {
  const dispatch = useAppDispatch();

  const {
    themeMode: theme,
    requiresVerification,
    requires2FA,
    verificationEmail,
    temp2FAUserId,
  } = useAppSelector((s) => s.auth);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [prefilledEmail, setPrefilledEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState('');

  // 1) Initialize Device ID and search URL reset tokens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let dId = localStorage.getItem('rf_device_id');
      if (!dId) {
        dId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('rf_device_id', dId);
      }
      setDeviceId(dId);

      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        setResetToken(token);
      }
    }
  }, []);

  const handleThemeChange = (t: Theme) => {
    dispatch(setThemeMode(t));
  };

  const handleCancelVerification = () => {
    dispatch(cancelVerification());
    setIsLoginMode(true);
    setIsForgotPasswordMode(false);
  };

  const renderActiveForm = () => {
    if (resetToken) {
      return (
        <ResetPasswordForm
          token={resetToken}
          onSuccess={() => {
            setResetToken(null);
            // Remove token from query parameters without reloading
            if (typeof window !== 'undefined' && window.history) {
              const url = new URL(window.location.href);
              url.searchParams.delete('token');
              window.history.replaceState({}, '', url.toString());
            }
            setIsLoginMode(true);
            setIsForgotPasswordMode(false);
          }}
        />
      );
    }

    if (requiresVerification && verificationEmail) {
      return (
        <VerifyEmailForm
          email={verificationEmail}
          onCancel={handleCancelVerification}
        />
      );
    }

    if (requires2FA && temp2FAUserId && verificationEmail) {
      return (
        <TwoFactorForm
          userId={temp2FAUserId}
          email={verificationEmail}
          deviceId={deviceId}
          onCancel={handleCancelVerification}
        />
      );
    }

    if (isForgotPasswordMode) {
      return (
        <ForgotPasswordForm onCancel={() => setIsForgotPasswordMode(false)} />
      );
    }

    if (isLoginMode) {
      return (
        <LoginForm
          prefilledEmail={prefilledEmail}
          deviceId={deviceId}
          onSwitchToSignUp={() => {
            setIsLoginMode(false);
            dispatch(clearAuthError());
          }}
          onSwitchToForgotPassword={() => {
            setIsForgotPasswordMode(true);
            dispatch(clearAuthError());
          }}
        />
      );
    }

    return (
      <SignUpForm
        onSwitchToSignIn={(email) => {
          if (email) {
            setPrefilledEmail(email);
          }
          setIsLoginMode(true);
          dispatch(clearAuthError());
        }}
      />
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-screen p-6 bg-[var(--bg-primary)]">
      {/* Theme switcher in corner */}
      <div className="fixed top-5 right-5 z-50">
        <ThemeSwitcher theme={theme} onChange={handleThemeChange} />
      </div>

      <div className="flex w-[900px] max-w-full min-h-[580px] overflow-hidden glass-panel animate-fade-in">
        {/* Left Branding Panel */}
        <div className="relative flex-[1.1] flex flex-col justify-center items-center p-12 text-white text-center overflow-hidden bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18)_0%,transparent_65%)]" />
          <div className="absolute -bottom-14 -right-14 w-56 h-56 rounded-full bg-[rgba(255,255,255,0.06)]" />

          {/* Brand icon */}
          <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-[rgba(255,255,255,0.18)] backdrop-blur-[8px]">
            <IconBolt />
          </div>

          <h1 className="relative z-10 text-[38px] font-bold tracking-tight mb-3">
            RelayFlow
          </h1>
          <p className="relative z-10 text-[15px] leading-relaxed opacity-85 max-w-[260px]">
            Ultra-fast, real-time messaging with NestJS WebSocket Gateway.
          </p>

          <div className="relative z-10 flex flex-col gap-2.5 mt-8 w-full">
            {[
              { icon: <IconZap />, text: 'Sub-millisecond delivery' },
              { icon: <IconShield />, text: 'JWT-secured channels' },
              { icon: <IconGlobe />, text: 'Real-time presence sync' },
            ].map(({ icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] text-left bg-[rgba(255,255,255,0.12)] backdrop-blur-[8px]"
              >
                {icon}
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex-1 flex flex-col justify-center p-12 bg-[var(--bg-chat)]">
          {renderActiveForm()}
        </div>
      </div>
    </div>
  );
};
