import React, { useState } from 'react';

import { useAppDispatch } from '../../store';
import { forgotPassword } from '../../store/slices/authSlice';
import { IconAlertCircle } from '../Icons';
import { showToast } from '../toast';

interface ForgotPasswordFormProps {
  onCancel: () => void;
}

export const ForgotPasswordForm = ({
  onCancel,
}: ForgotPasswordFormProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
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
      await dispatch(forgotPassword(email)).unwrap();
      setStatus('success');
      showToast.success('Password reset link sent!');
    } catch (err: any) {
      setStatus('failed');
      const errorMsg =
        typeof err === 'string' ? err : 'Failed to request reset link.';
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
