import React, { useState } from 'react';

import { useAppSelector } from '../store';
import type { Group, GroupMember } from '../store/slices/groupsSlice';

import { Avatar } from './Avatar';
import { IconCrown, IconPeople } from './Icons';

interface MemberSidebarProps {
  group: Group;
}

type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export const MemberSidebar = ({
  group,
}: MemberSidebarProps): React.JSX.Element => {
  const { onlineUsers, typingUsers, activeConversationId } = useAppSelector(
    (s) => s.chat,
  );
  const { user: currentUser } = useAppSelector((s) => s.auth);

  const [activeTab, setActiveTab] = useState<PresenceStatus>('online');

  // Group members into online, away, dnd, and offline
  const members = Array.isArray(group.members) ? group.members : [];

  const getMemberDetails = (m: GroupMember) => {
    const userDetail = m.user;
    const displayName =
      userDetail?.displayName || userDetail?.email?.split('@')[0] || 'User';
    const email = userDetail?.email || '';
    const presence =
      m.userId === currentUser?.id
        ? 'online'
        : onlineUsers[m.userId] || 'offline';
    const isOwner = group.ownerId === m.userId;
    const isTyping = activeConversationId
      ? !!typingUsers[activeConversationId]?.[m.userId]
      : false;

    return {
      id: m.userId,
      displayName,
      email,
      presence,
      isOwner,
      isTyping,
      role: m.role,
    };
  };

  const membersWithDetails = members.map((m) => getMemberDetails(m));

  const onlineMembers = membersWithDetails.filter(
    (m) => m.presence === 'online',
  );
  const awayMembers = membersWithDetails.filter((m) => m.presence === 'away');
  const dndMembers = membersWithDetails.filter((m) => m.presence === 'dnd');
  const offlineMembers = membersWithDetails.filter(
    (m) => m.presence === 'offline',
  );

  const getTabMembers = () => {
    switch (activeTab) {
      case 'online':
        return onlineMembers;
      case 'away':
        return awayMembers;
      case 'dnd':
        return dndMembers;
      case 'offline':
        return offlineMembers;
      default:
        return [];
    }
  };

  const currentTabMembers = getTabMembers();

  const renderMemberRow = (m: any) => (
    <div
      key={m.id}
      id={`member-row-${m.id}`}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 mb-1 cursor-default hover:bg-[var(--bg-input)] hover:translate-x-0.5 fade-in-list"
    >
      <Avatar
        letter={m.displayName[0].toUpperCase()}
        status={m.presence}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span
            className={`text-[13px] font-medium truncate ${m.presence === 'offline' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}
          >
            {m.displayName}
          </span>
          {m.isOwner && (
            <span className="text-[#eab308] flex shrink-0" title="Group Owner">
              <IconCrown />
            </span>
          )}
        </div>
        {m.isTyping ? (
          <div className="text-[10px] text-[var(--accent-secondary)] font-medium">
            typing...
          </div>
        ) : m.role !== 'member' ? (
          <div className="text-[10px] text-[var(--text-muted)] capitalize">
            {m.role}
          </div>
        ) : null}
      </div>
    </div>
  );

  const tabOptions: {
    id: PresenceStatus;
    label: string;
    count: number;
    color: string;
  }[] = [
    {
      id: 'online',
      label: 'Online',
      count: onlineMembers.length,
      color: '#10b981',
    },
    { id: 'away', label: 'Away', count: awayMembers.length, color: '#f59e0b' },
    { id: 'dnd', label: 'DND', count: dndMembers.length, color: '#ef4444' },
    {
      id: 'offline',
      label: 'Offline',
      count: offlineMembers.length,
      color: '#6b7280',
    },
  ];

  return (
    <div className="glass-panel w-[240px] min-w-[240px] h-full flex flex-col overflow-hidden">
      {/* Title */}
      <div className="px-4 py-3.5 border-b-[1.5px] border-[var(--border-muted)] flex items-center gap-1.5 text-[var(--text-primary)] text-sm font-bold bg-[var(--bg-sidebar)] rounded-t-2xl">
        <IconPeople />
        <span>Group Members ({members.length})</span>
      </div>

      {/* Tabs Selector UI - Rounded like other switcher */}
      <div className="px-3 pt-2.5 pb-1.5 bg-[rgba(0,0,0,0.01)]">
        <div className="grid grid-cols-4 gap-0.5 bg-[var(--theme-btn)] rounded-xl p-0.5 border border-[var(--glass-border)]">
          {tabOptions.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`member-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`border-0 rounded-[9px] py-1.5 px-0.5 text-[11px] font-semibold cursor-pointer flex flex-col items-center justify-center transition-all duration-150 outline-none active-press ${isActive ? 'bg-[var(--theme-btn-active)] text-[var(--theme-btn-active-text)]' : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--theme-btn-hover)]'}`}
              >
                <span className="text-[10px] capitalize">{tab.label}</span>
                <span className="text-[9px] opacity-80 mt-0.5">
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Member Lists Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {currentTabMembers.length > 0 ? (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] pl-2 mb-2 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{
                  backgroundColor: tabOptions.find((t) => t.id === activeTab)
                    ?.color,
                }}
              />
              {activeTab === 'dnd' ? 'Do Not Disturb' : activeTab} —{' '}
              {currentTabMembers.length}
            </div>
            {currentTabMembers.map(renderMemberRow)}
          </div>
        ) : (
          <div className="py-6 px-4 text-center text-[var(--text-muted)] text-xs italic">
            No members are {activeTab}
          </div>
        )}
      </div>
    </div>
  );
};
