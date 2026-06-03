'use client';

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  loginUser,
  registerUser,
  clearAuthError,
  setThemeMode,
} from '../store/slices/authSlice';
import { ThemeSwitcher, Theme } from './ThemeSwitcher';
import {
  IconBolt,
  IconZap,
  IconShield,
  IconGlobe,
  IconAlertCircle,
  IconEye,
  IconEyeOff,
} from './Icons';

export const AuthGate = (): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const { status: authStatus, error: authError, themeMode: theme } = useAppSelector((s) => s.auth);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleThemeChange = (t: Theme) => {
    dispatch(setThemeMode(t));
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!isLoginMode) {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
    }

    if (isLoginMode) {
      dispatch(loginUser({ email, password }));
    } else {
      dispatch(registerUser({ email, password, displayName }));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-screen p-6"
      style={{ background: 'var(--bg-primary)' }}>

      {/* Theme switcher in corner */}
      <div className="fixed top-5 right-5 z-50">
        <ThemeSwitcher theme={theme} onChange={handleThemeChange} />
      </div>

      <div className="flex w-[900px] max-w-full min-h-[580px] overflow-hidden glass-panel animate-fade-in">

        {/* Left Branding Panel */}
        <div className="relative flex-[1.1] flex flex-col justify-center items-center p-12 text-white text-center overflow-hidden"
          style={{ background: 'linear-gradient(140deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' }}>
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18) 0%, transparent 65%)' }} />
          <div className="absolute -bottom-14 -right-14 w-56 h-56 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* Brand icon */}
          <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
            <IconBolt />
          </div>

          <h1 className="relative z-10 text-[38px] font-bold tracking-tight mb-3">RelayFlow</h1>
          <p className="relative z-10 text-[15px] leading-relaxed opacity-85 max-w-[260px]">
            Ultra-fast, real-time messaging with NestJS WebSocket Gateway.
          </p>

          <div className="relative z-10 flex flex-col gap-2.5 mt-8 w-full">
            {[
              { icon: <IconZap />,    text: 'Sub-millisecond delivery' },
              { icon: <IconShield />, text: 'JWT-secured channels' },
              { icon: <IconGlobe />,  text: 'Real-time presence sync' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] text-left"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
                {icon}
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex-1 flex flex-col justify-center p-12"
          style={{ background: 'var(--bg-chat)' }}>
          <div className="mb-8">
            <h2 className="text-[28px] font-bold tracking-tight mb-2"
              style={{ color: 'var(--text-primary)' }}>
              {isLoginMode ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              {isLoginMode
                ? 'Enter your credentials to open your workspace.'
                : 'Register a profile to start instant messaging.'}
            </p>
          </div>

          {(localError || authError) && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-[13.5px] animate-fade-in"
              style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
              <IconAlertCircle />
              {localError || authError}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleAuthSubmit}>
            {!isLoginMode && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}>
                  Display Name
                </label>
                <input
                  id="auth-display-name"
                  type="text"
                  className="input-base rounded-[10px] px-4 py-3 text-[14.5px]"
                  placeholder="e.g. Umang"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={!isLoginMode}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                className="input-base rounded-[10px] px-4 py-3 text-[14.5px]"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-base w-full rounded-[10px] pl-4 pr-10 py-3 text-[14.5px]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 cursor-pointer transition-colors duration-200"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {!isLoginMode && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}>
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="input-base w-full rounded-[10px] pl-4 pr-10 py-3 text-[14.5px]"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 cursor-pointer transition-colors duration-200"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                  >
                    {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={authStatus === 'loading'}
              className="mt-2 rounded-[10px] py-3.5 text-[15px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden btn-send"
              onMouseEnter={(e) => { if (authStatus !== 'loading') { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--btn-shadow)'; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
            >
              {authStatus === 'loading' ? 'Processing…' : isLoginMode ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="text-center mt-6 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            {isLoginMode ? "Don't have an account?" : 'Already registered?'}
            <button
              id="auth-toggle-btn"
              className="ml-1.5 font-semibold cursor-pointer transition-colors duration-200"
              style={{ color: 'var(--accent-primary)', background: 'none', border: 'none' }}
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                dispatch(clearAuthError());
                setLocalError(null);
                setPassword('');
                setConfirmPassword('');
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
            >
              {isLoginMode ? 'Create account' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
