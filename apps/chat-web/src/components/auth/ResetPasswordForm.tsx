import React, { useState } from 'react';

import { useAppDispatch } from '../../store';
import { resetPassword } from '../../store/slices/authSlice';
import { IconAlertCircle } from '../Icons';
import { showToast } from '../toast';

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

export const ResetPasswordForm = ({
  token,
  onSuccess,
}: ResetPasswordFormProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
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
      await dispatch(resetPassword({ token, password })).unwrap();
      setStatus('success');
      showToast.success('Password updated successfully!');
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err: any) {
      setStatus('failed');
      const errorMsg =
        typeof err === 'string'
          ? err
          : 'Reset failed. The token is invalid or has expired.';
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
