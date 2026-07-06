import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import {
  verifyEmailOtp,
  resendVerificationCode,
} from '../../store/slices/authSlice';
import { IconAlertCircle } from '../Icons';
import { showToast } from '../toast';

interface VerifyEmailFormProps {
  email: string;
  onCancel: () => void;
}

export const VerifyEmailForm = ({
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
    const dId =
      typeof window !== 'undefined'
        ? localStorage.getItem('rf_device_id') || undefined
        : undefined;
    dispatch(verifyEmailOtp({ email, otp, deviceId: dId }));
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
