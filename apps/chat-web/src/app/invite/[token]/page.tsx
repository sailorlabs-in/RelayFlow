'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../store';
import { restoreSession } from '../../../store/slices/authSlice';
import {
  fetchGroups,
  setActiveGroup,
  resolveGroupInvite,
  acceptGroupInvite,
} from '../../../store/slices/groupsSlice';
import { AuthGate } from '../../../components/AuthGate';
import StoreProvider from '../../../store/StoreProvider';
import { showToast } from '../../../components/toast';

function InvitePageContent() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const dispatch = useAppDispatch();

  const { accessToken } = useAppSelector((s) => s.auth);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<{
    id: string;
    name: string;
    description?: string;
  } | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Restore session
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  // Load invite details if logged in
  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    const loadInviteDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await dispatch(resolveGroupInvite(token)).unwrap();
        setGroupDetails(result);
      } catch (err: any) {
        setError(err || '❌ This invite link is invalid or has expired.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInviteDetails();
  }, [accessToken, token]);

  const handleJoin = async () => {
    if (!accessToken || !groupDetails) {
      return;
    }
    setIsJoining(true);
    try {
      const joinedGroup = await dispatch(acceptGroupInvite(token)).unwrap();
      showToast.success(`Successfully joined group ${groupDetails.name}!`);
      // Update groups in Redux store
      await dispatch(fetchGroups()).unwrap();
      // Set active group
      dispatch(setActiveGroup(joinedGroup.id));
      // Redirect to dashboard
      router.push('/');
    } catch (err: any) {
      showToast.error(err || 'Failed to join group.');
    } finally {
      setIsJoining(false);
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
          <div>Loading invite details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-chat)] text-[var(--text-primary)] font-sans p-4">
        <div className="w-[400px] max-w-full bg-[var(--glass-bg)] border-[1.5px] border-[var(--glass-border)] backdrop-blur-[20px] rounded-[18px] shadow-[var(--glass-shadow)] p-6 text-center animate-slide-up">
          <h2 className="text-[20px] font-bold text-[var(--danger)] mb-3">
            Invite Error
          </h2>
          <p className="text-[14px] text-[var(--text-secondary)] mb-6">
            {error}
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
          {groupDetails?.name ? groupDetails.name[0].toUpperCase() : 'G'}
        </div>
        <h2 className="text-[22px] font-bold tracking-tight mb-2 text-[var(--text-primary)]">
          Group Invitation
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mb-6">
          You are invited to join{' '}
          <strong className="text-[var(--text-primary)]">
            {groupDetails?.name}
          </strong>
          .
          {groupDetails?.description && (
            <span className="block mt-2 text-xs italic">
              "{groupDetails.description}"
            </span>
          )}
        </p>
        <p className="text-[13px] text-[var(--text-muted)] mb-6">
          Would you like to accept this invitation?
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full btn-send rounded-[10px] py-3 text-[14.5px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active-press"
          >
            {isJoining ? 'Joining Group...' : 'Accept Invite'}
          </button>
          <button
            onClick={() => router.push('/')}
            disabled={isJoining}
            className="w-full bg-transparent border border-[var(--glass-border)] text-[var(--text-secondary)] rounded-[10px] py-3 text-[14.5px] font-semibold cursor-pointer hover:bg-[var(--bg-input)] transition-all duration-200 active-press"
          >
            Decline & Exit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <StoreProvider>
      <InvitePageContent />
    </StoreProvider>
  );
}
