import React from 'react';
import { useAppSelector } from '../store';
import { Group, GroupMember } from '../store/slices/groupsSlice';
import { Avatar } from './Avatar';
import { IconCrown, IconPeople } from './Icons';

interface MemberSidebarProps {
  group: Group;
}

export const MemberSidebar = ({ group }: MemberSidebarProps): React.JSX.Element => {
  const { onlineUsers, typingUsers, activeConversationId } = useAppSelector((s) => s.chat);
  const { user: currentUser } = useAppSelector((s) => s.auth);

  // Group members into online and offline
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

  const onlineMembers = membersWithDetails.filter((m) => m.presence !== 'offline');
  const offlineMembers = membersWithDetails.filter((m) => m.presence === 'offline');

  const renderMemberRow = (m: any) => (
    <div
      key={m.id}
      id={`member-row-${m.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 8px',
        borderRadius: '8px',
        transition: 'background 0.15s',
        marginBottom: '2px',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-input)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
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

  return (
    <div
      style={{
        width: '220px',
        minWidth: '220px',
        height: '100%',
        borderLeft: '1.5px solid var(--border-muted)',
        background: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
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
        }}
      >
        <IconPeople />
        <span>Group Members ({members.length})</span>
      </div>

      {/* Member Lists */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        {/* Online Section */}
        {onlineMembers.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                paddingLeft: '8px',
                marginBottom: '6px',
              }}
            >
              Online — {onlineMembers.length}
            </div>
            {onlineMembers.map(renderMemberRow)}
          </div>
        )}

        {/* Offline Section */}
        {offlineMembers.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                paddingLeft: '8px',
                marginBottom: '6px',
              }}
            >
              Offline — {offlineMembers.length}
            </div>
            {offlineMembers.map(renderMemberRow)}
          </div>
        )}
      </div>
    </div>
  );
};
