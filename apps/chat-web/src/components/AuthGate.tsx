'use client';

import React, { useState, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import {
  clearAuthError,
  cancelVerification,
  setThemeMode,
} from '../store/slices/authSlice';

import { ForgotPasswordForm } from './auth/ForgotPasswordForm';
import { LoginForm } from './auth/LoginForm';
import { ResetPasswordForm } from './auth/ResetPasswordForm';
import { SignUpForm } from './auth/SignUpForm';
import { TwoFactorForm } from './auth/TwoFactorForm';
import { VerifyEmailForm } from './auth/VerifyEmailForm';
import { IconZap, IconShield, IconGlobe } from './Icons';
import type { Theme } from './ThemeSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

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

  // Initialize Device ID and search URL reset tokens
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
    <div className="relative grid place-items-center min-h-screen w-screen p-4 sm:p-6 overflow-y-auto bg-[var(--bg-primary)]">
      {/* Theme switcher in corner */}
      <div className="absolute top-5 right-5 z-50 md:fixed md:top-5 md:right-5">
        <ThemeSwitcher theme={theme} onChange={handleThemeChange} />
      </div>

      <div className="flex flex-col md:flex-row w-full max-w-[450px] md:w-[900px] md:max-w-full min-h-0 md:min-h-[580px] overflow-hidden glass-panel animate-fade-in">
        {/* Left Branding Panel */}
        <div className="hidden md:flex relative flex-[1.1] flex-col justify-center items-center p-12 text-white text-center overflow-hidden bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18)_0%,transparent_65%)]" />
          <div className="absolute -bottom-14 -right-14 w-56 h-56 rounded-full bg-[rgba(255,255,255,0.06)]" />

          {/* Brand icon */}
          <div className="relative z-10 w-14 h-14 rounded-2xl overflow-hidden mb-6 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.15)] backdrop-blur-[8px]">
            <img
              src="/logo.png"
              alt="RelayFlow Logo"
              className="w-full h-full object-cover"
            />
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
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 bg-[var(--bg-chat)]">
          {renderActiveForm()}
        </div>
      </div>
    </div>
  );
};
