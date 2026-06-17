'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../store';
import { restoreSession, fetchCurrentUser } from '../../store/slices/authSlice';
import { fetchGroups, setActiveGroup } from '../../store/slices/groupsSlice';
import { AuthGate } from '../../components/AuthGate';
import StoreProvider from '../../store/StoreProvider';
import { showToast } from '../../components/toast';
import ApiRequest from '../../utils/ApiRequest';

function AcceptTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const dispatch = useAppDispatch();

  const { accessToken } = useAppSelector((s) => s.auth);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Restore session
  useEffect(() => {
    dispatch(restoreSession());
    const savedToken =
      typeof window !== 'undefined' ? localStorage.getItem('chat_token') : null;
    if (savedToken) {
      dispatch(fetchCurrentUser());
    }
    setIsLoading(false);
  }, [dispatch]);

  const handleAccept = async () => {
    if (!accessToken || !token) {
      return;
    }
    setIsProcessing(true);
    try {
      const updatedGroup = await ApiRequest(
        '/groups/transfer-ownership/accept',
        'post',
        { token },
      );
      showToast.success(`Successfully accepted ownership transfer!`);
      // Update groups in Redux store
      await dispatch(fetchGroups()).unwrap();
      // Set active group
      dispatch(setActiveGroup(updatedGroup.id));
      // Redirect to dashboard
      router.push('/');
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to accept ownership transfer.';
      showToast.error(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!accessToken) {
    return <AuthGate />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-chat)] text-[var(--text-primary)] font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
          <div>Loading transfer details...</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-chat)] text-[var(--text-primary)] font-sans p-4">
        <div className="w-[400px] max-w-full bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[18px] shadow-[var(--glass-shadow)] p-6 text-center animate-slide-up">
          <h2 className="text-[20px] font-bold text-[var(--danger)] mb-3">
            Invalid Link
          </h2>
          <p className="text-[14px] text-[var(--text-secondary)] mb-6">
            This ownership transfer link is missing a valid token.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full btn-send rounded-[10px] py-3 text-[14.5px] font-semibold text-white cursor-pointer active-press"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-chat)] text-[var(--text-primary)] font-sans p-4">
      <div className="w-[420px] max-w-full bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[18px] shadow-[var(--glass-shadow)] p-6 text-center animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-[var(--accent-ring)] text-[var(--accent-primary)] flex items-center justify-center text-[28px] font-bold mx-auto mb-4 border border-[var(--accent-primary)]">
          👑
        </div>
        <h2 className="text-[22px] font-bold tracking-tight mb-2 text-[var(--text-primary)]">
          Server Ownership Transfer
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-6 leading-relaxed">
          You have been requested to assume ownership of this server/group.
          Accepting this transfer will grant you full administrator rights,
          server settings control, and primary ownership.
        </p>
        <p className="text-[13px] text-[var(--text-muted)] mb-6">
          Would you like to accept ownership transfer?
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="w-full btn-send rounded-[10px] py-3 text-[14.5px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active-press"
          >
            {isProcessing ? 'Accepting Ownership...' : 'Accept & Become Owner'}
          </button>
          <button
            onClick={() => router.push('/')}
            disabled={isProcessing}
            className="w-full bg-transparent border border-[var(--glass-border)] text-[var(--text-secondary)] rounded-[10px] py-3 text-[14.5px] font-semibold cursor-pointer hover:bg-[var(--bg-input)] transition-all duration-200 active-press"
          >
            Decline & Exit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AcceptTransferPage() {
  return (
    <StoreProvider>
      <Suspense
        fallback={
          <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-chat)] text-[var(--text-primary)] font-sans">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--accent-primary)] mx-auto"></div>
          </div>
        }
      >
        <AcceptTransferContent />
      </Suspense>
    </StoreProvider>
  );
}
