import React from 'react';
import { Avatar } from '../../../components/Avatar';
import { IconLock } from './ProfileIcons';

interface AccountTabProps {
  user: any;
  userStatus: string;
  displayName: string;
  setDisplayName: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  checkingUsername: boolean;
  usernameAvailable: boolean | null;
  avatarUrl: string;
  setAvatarUrl: (val: string) => void;
  avatarThumbnailUrl: string;
  setAvatarThumbnailUrl: (val: string) => void;
  uploadingAvatar: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  deleteOldMedia: (url: string) => Promise<void>;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  isTwoFactorEnabled: boolean;
  setIsTwoFactorEnabled: (val: boolean) => void;
  twoFactorOnlyNewDevice: boolean;
  setTwoFactorOnlyNewDevice: (val: boolean) => void;
}

export const AccountTab: React.FC<AccountTabProps> = ({
  user,
  userStatus,
  displayName,
  setDisplayName,
  username,
  setUsername,
  checkingUsername,
  usernameAvailable,
  avatarUrl,
  setAvatarUrl,
  avatarThumbnailUrl,
  setAvatarThumbnailUrl,
  uploadingAvatar,
  avatarInputRef,
  handleAvatarUpload,
  deleteOldMedia,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  isTwoFactorEnabled,
  setIsTwoFactorEnabled,
  twoFactorOnlyNewDevice,
  setTwoFactorOnlyNewDevice,
}) => {
  return (
    <div className="flex flex-col gap-5 flex-1">
      <div>
        <h2
          className="text-[17px] font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Account Settings
        </h2>
        <p
          className="text-[12px] mt-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Modify your basic account info, username, and password.
        </p>
      </div>

      {/* Avatar upload picture container */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.02)] dark:bg-[rgba(255,255,255,0.015)] shadow-sm animate-fade-in">
        <div className="relative shrink-0">
          <Avatar
            letter={(displayName || username || user.email)[0].toUpperCase()}
            url={avatarUrl}
            size="lg"
            status={userStatus}
          />
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-white" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Profile Picture
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border-none bg-[var(--theme-btn-active)] text-[var(--theme-btn-active-text)] hover:opacity-95 disabled:opacity-50 active-press"
            >
              Change Avatar
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => {
                  deleteOldMedia(avatarUrl);
                  if (avatarThumbnailUrl && avatarThumbnailUrl !== avatarUrl) {
                    deleteOldMedia(avatarThumbnailUrl);
                  }
                  setAvatarUrl('');
                  setAvatarThumbnailUrl('');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-all active-press"
              >
                Remove
              </button>
            )}
          </div>
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          className="text-[11.5px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          Email address
        </label>
        <input
          type="email"
          disabled
          className="input-base rounded-[10px] px-4 py-3 text-[14px] cursor-not-allowed opacity-60"
          value={user.email}
        />
        <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
          Registered email cannot be modified.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          className="text-[11.5px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          Username
        </label>
        <input
          type="text"
          required
          className="input-base rounded-[10px] px-4 py-3 text-[14px]"
          placeholder="Enter unique username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--glass-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {checkingUsername && (
          <span className="text-[11px] text-[var(--text-muted)] mt-1 animate-pulse flex items-center gap-1">
            Checking availability...
          </span>
        )}
        {!checkingUsername && usernameAvailable === true && (
          <span className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
            ✔ Username is available
          </span>
        )}
        {!checkingUsername && usernameAvailable === false && (
          <span className="text-[11px] text-red-500 font-medium mt-1 flex items-center gap-1">
            ❌ Username is taken
          </span>
        )}
        {!checkingUsername && usernameAvailable === null && (
          <span
            className="text-[10.5px]"
            style={{ color: 'var(--text-muted)' }}
          >
            Your unique username for search.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          className="text-[11.5px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          Name
        </label>
        <input
          type="text"
          required
          className="input-base rounded-[10px] px-4 py-3 text-[14px]"
          placeholder="Enter your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--glass-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      <div
        className="border-t pt-4 mt-2"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <div
          className="flex items-center text-[13px] font-bold mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          <IconLock />
          Update Password
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              New Password
            </label>
            <input
              type="password"
              className="input-base rounded-[10px] px-4 py-3 text-[14px]"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px var(--accent-ring)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              className="input-base rounded-[10px] px-4 py-3 text-[14px]"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px var(--accent-ring)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
          Leave blank if you do not wish to change your password.
        </p>
      </div>

      <div
        className="border-t pt-4 mt-2"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <div
          className="flex items-center text-[13px] font-bold mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 mr-2 opacity-60"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Two-Factor Authentication (2FA)
        </div>

        <div className="flex flex-col gap-4">
          {/* Toggle 1: Enable 2FA */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.01)]">
            <div className="flex flex-col gap-0.5 pr-4">
              <span
                className="font-bold text-[13.5px]"
                style={{ color: 'var(--text-primary)' }}
              >
                Enable Two-Factor Authentication
              </span>
              <span
                className="text-[11px]"
                style={{ color: 'var(--text-muted)' }}
              >
                Require a security code sent to your email to log in
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isTwoFactorEnabled}
                onChange={(e) => {
                  setIsTwoFactorEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setTwoFactorOnlyNewDevice(false);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
            </label>
          </div>

          {/* Toggle 2: Only ask OTP on new device */}
          {isTwoFactorEnabled && (
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--glass-border)] bg-[rgba(0,0,0,0.01)] animate-fade-in">
              <div className="flex flex-col gap-0.5 pr-4">
                <span
                  className="font-bold text-[13.5px]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Only ask OTP on new device
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Bypass OTP prompt if the login device is recognized/remembered
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={twoFactorOnlyNewDevice}
                  onChange={(e) => setTwoFactorOnlyNewDevice(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]" />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
