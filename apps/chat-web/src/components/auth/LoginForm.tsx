import React, { useState, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import { loginUser } from '../../store/slices/authSlice';
import { IconAlertCircle, IconEye, IconEyeOff } from '../Icons';

interface LoginFormProps {
  prefilledEmail: string;
  onSwitchToSignUp: () => void;
  onSwitchToForgotPassword: () => void;
  deviceId: string;
}

export const LoginForm = ({
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

  useEffect(() => {
    setEmail(prefilledEmail);
  }, [prefilledEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginUser({ email, password, deviceId }));
  };

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

      {authError && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13.5px] animate-fade-in bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)]">
          <IconAlertCircle />
          {authError}
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
