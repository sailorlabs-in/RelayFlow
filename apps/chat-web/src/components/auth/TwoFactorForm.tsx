import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store';
import { verify2FaOtp } from '../../store/slices/authSlice';
import { IconAlertCircle } from '../Icons';

interface TwoFactorFormProps {
  userId: string;
  email: string;
  deviceId: string;
  onCancel: () => void;
}

export const TwoFactorForm = ({
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
