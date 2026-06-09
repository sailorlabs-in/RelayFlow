import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import { registerUser } from '../../store/slices/authSlice';
import { IconAlertCircle, IconEye, IconEyeOff } from '../Icons';
import { showToast } from '../toast';

interface SignUpFormProps {
  onSwitchToSignIn: (prefilledEmail?: string) => void;
}

export const SignUpForm = ({
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
