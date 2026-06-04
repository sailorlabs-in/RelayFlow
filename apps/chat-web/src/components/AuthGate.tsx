'use client';

import React, { useState, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import {
  loginUser,
  registerUser,
  clearAuthError,
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
}

const LoginForm = ({
  prefilledEmail,
  onSwitchToSignUp,
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
    dispatch(loginUser({ email, password }));
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    dispatch(registerUser({ email, password, displayName }))
      .unwrap()
      .then(() => {
        showToast.success('Account created successfully! Please sign in.');
        onSwitchToSignIn(email);
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

// ── AUTH GATE CONTAINER ───────────────────────────────────────────────────────
export const AuthGate = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { themeMode: theme } = useAppSelector((s) => s.auth);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [prefilledEmail, setPrefilledEmail] = useState('');

  const handleThemeChange = (t: Theme) => {
    dispatch(setThemeMode(t));
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
          {isLoginMode ? (
            <LoginForm
              prefilledEmail={prefilledEmail}
              onSwitchToSignUp={() => {
                setIsLoginMode(false);
                dispatch(clearAuthError());
              }}
            />
          ) : (
            <SignUpForm
              onSwitchToSignIn={(email) => {
                if (email) {
                  setPrefilledEmail(email);
                }
                setIsLoginMode(true);
                dispatch(clearAuthError());
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
