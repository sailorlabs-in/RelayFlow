import React, { useState } from 'react';

import { useAppSelector } from '../store';
import type { Group, GroupMember } from '../store/slices/groupsSlice';

import { Avatar } from './Avatar';
import { IconCrown, IconPeople } from './Icons';

interface MemberSidebarProps {
  group: Group;
}

type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

export const MemberSidebar = ({ group }: MemberSidebarProps): React.JSX.Element => {
  const { onlineUsers, typingUsers, activeConversationId } = useAppSelector((s) => s.chat);
  const { user: currentUser } = useAppSelector((s) => s.auth);

  const [activeTab, setActiveTab] = useState<PresenceStatus>('online');

  // Group members into online, away, dnd, and offline
  const members = Array.isArray(group.members) ? group.members : [];

  const getMemberDetails = (m: GroupMember) => {
    const userDetail = m.user;
    const displayName = userDetail?.displayName || userDetail?.email?.split('@')[0] || 'User';
    const email = userDetail?.email || '';
    const presence = m.userId === currentUser?.id ? 'online' : (onlineUsers[m.userId] || 'offline');
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

  const onlineMembers = membersWithDetails.filter((m) => m.presence === 'online');
  const awayMembers = membersWithDetails.filter((m) => m.presence === 'away');
  const dndMembers = membersWithDetails.filter((m) => m.presence === 'dnd');
  const offlineMembers = membersWithDetails.filter((m) => m.presence === 'offline');

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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '10px',
        transition: 'background 0.15s, transform 0.1s',
        marginBottom: '4px',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-input)';
        e.currentTarget.style.transform = 'translateX(2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <Avatar letter={m.displayName[0].toUpperCase()} status={m.presence} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: m.presence === 'offline' ? 'var(--text-muted)' : 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {m.displayName}
          </span>
          {m.isOwner && (
            <span style={{ color: '#eab308', display: 'flex', flexShrink: 0 }} title="Group Owner">
              <IconCrown />
            </span>
          )}
        </div>
        {m.isTyping ? (
          <div style={{ fontSize: '10px', color: 'var(--accent-secondary)', fontWeight: 500 }}>
            typing...
          </div>
        ) : m.role !== 'member' ? (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {m.role}
          </div>
        ) : null}
      </div>
    </div>
  );

  const tabOptions: { id: PresenceStatus; label: string; count: number; color: string }[] = [
    { id: 'online', label: 'Online', count: onlineMembers.length, color: '#10b981' },
    { id: 'away', label: 'Away', count: awayMembers.length, color: '#f59e0b' },
    { id: 'dnd', label: 'DND', count: dndMembers.length, color: '#ef4444' },
    { id: 'offline', label: 'Offline', count: offlineMembers.length, color: '#6b7280' },
  ];

  return (
    <div
      className="glass-panel"
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Title */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1.5px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: 700,
          background: 'var(--bg-sidebar)',
          borderTopLeftRadius: '1rem',
          borderTopRightRadius: '1rem',
        }}
      >
        <IconPeople />
        <span>Group Members ({members.length})</span>
      </div>

      {/* Tabs Selector UI - Rounded like other switcher */}
      <div style={{ padding: '10px 12px 6px 12px', background: 'rgba(0,0,0,0.01)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '2px',
            background: 'var(--theme-btn)',
            borderRadius: '12px',
            padding: '3px',
            border: '1px solid var(--glass-border)',
          }}
        >
          {tabOptions.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`member-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isActive ? 'var(--theme-btn-active)' : 'transparent',
                  color: isActive ? 'var(--theme-btn-active-text)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '9px',
                  padding: '6px 2px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--theme-btn-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '10px', textTransform: 'capitalize' }}>{tab.label}</span>
                <span style={{ fontSize: '9px', opacity: 0.8, marginTop: '1px' }}>({tab.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Member Lists Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {currentTabMembers.length > 0 ? (
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                paddingLeft: '8px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: tabOptions.find((t) => t.id === activeTab)?.color,
                  display: 'inline-block',
                }}
              />
              {activeTab === 'dnd' ? 'Do Not Disturb' : activeTab} — {currentTabMembers.length}
            </div>
            {currentTabMembers.map(renderMemberRow)}
          </div>
        ) : (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontStyle: 'italic',
            }}
          >
            No members are {activeTab}
          </div>
        )}
      </div>
    </div>
  );
};
