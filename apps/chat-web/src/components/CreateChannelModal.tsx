import React, { useState, useMemo, useRef, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { GroupRole, GroupMember } from '../store/slices/groupsSlice';
import { createChannel } from '../store/slices/groupsSlice';

import { IconX, IconHash, IconLock, IconUserPlus } from './Icons';
import { showToast } from './toast';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface PermissionOverride {
  id: string;
  type: 'role' | 'member';
  viewChannel: 'allow' | 'deny' | 'neutral';
  sendMessages: 'allow' | 'deny' | 'neutral';
}

interface CreateChannelModalProps {
  groupId: string;
  groupName: string;
  sectionId?: string;
  onClose: () => void;
}

// ─── Tri-state Toggle Component ─────────────────────────────────────────────
const TriStateToggle = ({
  value,
  onChange,
  disabled,
}: {
  value: 'allow' | 'deny' | 'neutral';
  onChange: (val: 'allow' | 'deny' | 'neutral') => void;
  disabled?: boolean;
}) => {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Allow */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value === 'allow' ? 'neutral' : 'allow')}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          value === 'allow'
            ? 'bg-[#3ba55d] text-white shadow-[0_2px_8px_rgba(59,165,93,0.4)]'
            : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.5)]'
        }`}
        title="Allow"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
      {/* Neutral */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('neutral')}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          value === 'neutral'
            ? 'bg-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.6)]'
            : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.5)]'
        }`}
        title="Inherit / Neutral"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      {/* Deny */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value === 'deny' ? 'neutral' : 'deny')}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          value === 'deny'
            ? 'bg-[#ed4245] text-white shadow-[0_2px_8px_rgba(237,66,69,0.4)]'
            : 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.5)]'
        }`}
        title="Deny"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

// ─── Role/Member Chip ───────────────────────────────────────────────────────
const OverrideChip = ({
  override,
  roles,
  members,
  isSelected,
  onClick,
  onRemove,
}: {
  override: PermissionOverride;
  roles: GroupRole[];
  members: GroupMember[];
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
}) => {
  const role =
    override.type === 'role' ? roles.find((r) => r.id === override.id) : null;
  const member =
    override.type === 'member'
      ? members.find((m) => m.userId === override.id)
      : null;

  const displayName = role
    ? role.name
    : member
      ? member.user?.displayName ||
        member.user?.username ||
        member.user?.email ||
        member.userId
      : override.id;

  const color = role?.color || undefined;

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-[rgba(255,255,255,0.1)] border-l-2'
          : 'bg-transparent hover:bg-[rgba(255,255,255,0.04)] border-l-2 border-transparent'
      }`}
      style={{
        borderLeftColor: isSelected
          ? color || 'var(--accent-primary)'
          : undefined,
      }}
    >
      <div
        className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
        style={{
          backgroundColor: color ? `${color}22` : 'rgba(255,255,255,0.08)',
          color: color || 'var(--text-secondary)',
        }}
      >
        {override.type === 'role' ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
        ) : member?.user?.avatarThumbnailUrl || member?.user?.avatarUrl ? (
          <img
            src={member.user.avatarThumbnailUrl || member.user.avatarUrl}
            alt=""
            className="w-5.5 h-5.5 rounded-full object-cover"
          />
        ) : (
          <span>{displayName.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <span
        className="text-[12px] font-medium truncate flex-1"
        style={{ color: color || 'var(--text-primary)' }}
      >
        {displayName}
      </span>

      {override.id !== 'everyone' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="md:opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-[rgba(255,255,255,0.3)] hover:text-[#ed4245] transition-all"
        >
          <IconX size={8} />
        </button>
      )}
    </div>
  );
};

// ─── Add Override Dropdown ──────────────────────────────────────────────────
const AddOverrideDropdown = ({
  roles,
  members,
  existingIds,
  onAdd,
  onClose,
}: {
  roles: GroupRole[];
  members: GroupMember[];
  existingIds: Set<string>;
  onAdd: (id: string, type: 'role' | 'member') => void;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<'roles' | 'members'>('roles');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredRoles = roles.filter(
    (r) =>
      !existingIds.has(r.id) &&
      r.name.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredMembers = members
    .filter((m) => !m.isGhost)
    .filter((m) => !existingIds.has(m.userId))
    .filter((m) => {
      const name =
        m.user?.displayName || m.user?.username || m.user?.email || '';
      return name.toLowerCase().includes(query.toLowerCase());
    });

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      style={{ backgroundColor: 'var(--bg-secondary, #2b2d31)' }}
    >
      <div className="p-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          autoFocus
          className="w-full py-1.5 px-3 rounded-md text-xs box-border focus:outline-none border-none text-theme-primary bg-theme-input"
        />
      </div>

      <div className="flex border-b border-[rgba(255,255,255,0.06)]">
        <button
          type="button"
          onClick={() => setSection('roles')}
          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-none cursor-pointer transition-all ${
            section === 'roles'
              ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-transparent'
              : 'text-[rgba(255,255,255,0.4)] bg-transparent hover:text-[rgba(255,255,255,0.6)]'
          }`}
          style={
            section === 'roles'
              ? {
                  borderBottomWidth: '2px',
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'var(--accent-primary)',
                }
              : undefined
          }
        >
          Roles
        </button>
        <button
          type="button"
          onClick={() => setSection('members')}
          className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-none cursor-pointer transition-all ${
            section === 'members'
              ? 'text-[var(--accent-primary)] bg-transparent'
              : 'text-[rgba(255,255,255,0.4)] bg-transparent hover:text-[rgba(255,255,255,0.6)]'
          }`}
          style={
            section === 'members'
              ? {
                  borderBottomWidth: '2px',
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'var(--accent-primary)',
                }
              : undefined
          }
        >
          Members
        </button>
      </div>

      <div className="max-h-36 overflow-y-auto p-1">
        {section === 'roles' ? (
          filteredRoles.length === 0 ? (
            <div className="py-2 text-center text-[11px] text-[rgba(255,255,255,0.3)]">
              No roles available
            </div>
          ) : (
            filteredRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => onAdd(role.id, 'role')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-transparent border-none cursor-pointer text-left hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: role.color || '#99aab5' }}
                />
                <span
                  className="text-[12px] font-medium"
                  style={{ color: role.color || 'var(--text-primary)' }}
                >
                  {role.name}
                </span>
              </button>
            ))
          )
        ) : filteredMembers.length === 0 ? (
          <div className="py-2 text-center text-[11px] text-[rgba(255,255,255,0.3)]">
            No members available
          </div>
        ) : (
          filteredMembers.map((m) => {
            const name =
              m.user?.displayName ||
              m.user?.username ||
              m.user?.email ||
              m.userId;
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => onAdd(m.userId, 'member')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-transparent border-none cursor-pointer text-left hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                {m.user?.avatarThumbnailUrl || m.user?.avatarUrl ? (
                  <img
                    src={m.user.avatarThumbnailUrl || m.user.avatarUrl}
                    alt=""
                    className="w-4.5 h-4.5 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-4.5 h-4.5 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[8px] font-bold text-[rgba(255,255,255,0.5)] flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[12px] text-theme-primary truncate">
                  {name}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export const CreateChannelModal = ({
  groupId,
  groupName,
  sectionId,
  onClose,
}: CreateChannelModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();

  // Select group, roles, members
  const group = useAppSelector((state) =>
    state.groups.groups.find((g) => g.id === groupId),
  );
  const roles = group?.roles || [];
  const members = group?.members || [];

  const [channelName, setChannelName] = useState('');
  const [layout, setLayout] = useState<'text' | 'bubble' | 'voice'>('text');
  const [notificationSetting, setNotificationSetting] = useState<
    'all' | 'mention' | 'none'
  >('all');
  const [isLoading, setIsLoading] = useState(false);

  // Permission Overrides
  const [overrides, setOverrides] = useState<PermissionOverride[]>(() => [
    {
      id: 'everyone',
      type: 'role',
      viewChannel: 'neutral',
      sendMessages: 'neutral',
    },
  ]);

  const [selectedOverrideKey, setSelectedOverrideKey] = useState<string | null>(
    'role-everyone',
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const selectedOverride = useMemo(() => {
    if (!selectedOverrideKey) {
      return null;
    }
    return (
      overrides.find((o) => `${o.type}-${o.id}` === selectedOverrideKey) || null
    );
  }, [overrides, selectedOverrideKey]);

  const existingOverrideIds = useMemo(() => {
    const set = new Set<string>();
    overrides.forEach((o) => set.add(o.id));
    return set;
  }, [overrides]);

  const isReadOnly = useMemo(() => {
    const everyoneOverride = overrides.find(
      (o) => o.id === 'everyone' && o.type === 'role',
    );
    return everyoneOverride?.sendMessages === 'deny';
  }, [overrides]);

  const sanitize = (val: string) =>
    val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChannelName(sanitize(e.target.value));
  };

  const handleAddOverride = (id: string, type: 'role' | 'member') => {
    const newOverride: PermissionOverride = {
      id,
      type,
      viewChannel: 'neutral',
      sendMessages: 'neutral',
    };
    setOverrides([...overrides, newOverride]);
    setSelectedOverrideKey(`${type}-${id}`);
    setShowAddDropdown(false);
  };

  const handleRemoveOverride = (key: string) => {
    setOverrides(overrides.filter((o) => `${o.type}-${o.id}` !== key));
    if (selectedOverrideKey === key) {
      setSelectedOverrideKey('role-everyone');
    }
  };

  const handleUpdateOverride = (
    key: string,
    field: 'viewChannel' | 'sendMessages',
    value: 'allow' | 'deny' | 'neutral',
  ) => {
    setOverrides(
      overrides.map((o) =>
        `${o.type}-${o.id}` === key ? { ...o, [field]: value } : o,
      ),
    );
  };

  const buildBackendArrays = () => {
    const allowedRoleIds: string[] = [];
    const readRoleIds: string[] = [];
    const writeRoleIds: string[] = [];
    const hiddenFromUserIds: string[] = [];
    const hiddenFromRoleIds: string[] = [];
    const readUserIds: string[] = [];
    const writeUserIds: string[] = [];
    const denyWriteRoleIds: string[] = [];
    const denyWriteUserIds: string[] = [];

    overrides.forEach((o) => {
      if (o.type === 'role') {
        if (o.viewChannel === 'allow') {
          allowedRoleIds.push(o.id);
          readRoleIds.push(o.id);
        } else if (o.viewChannel === 'deny') {
          hiddenFromRoleIds.push(o.id);
        }
        if (o.sendMessages === 'allow') {
          writeRoleIds.push(o.id);
        } else if (o.sendMessages === 'deny') {
          denyWriteRoleIds.push(o.id);
        }
      } else {
        // member
        if (o.viewChannel === 'allow') {
          readUserIds.push(o.id);
        } else if (o.viewChannel === 'deny') {
          hiddenFromUserIds.push(o.id);
        }
        if (o.sendMessages === 'allow') {
          writeUserIds.push(o.id);
        } else if (o.sendMessages === 'deny') {
          denyWriteUserIds.push(o.id);
        }
      }
    });

    return {
      allowedRoleIds,
      readRoleIds,
      writeRoleIds,
      hiddenFromUserIds,
      hiddenFromRoleIds,
      readUserIds,
      writeUserIds,
      denyWriteRoleIds,
      denyWriteUserIds,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = channelName.trim();
    if (!name) {
      showToast.error('Please enter a channel name.');
      return;
    }
    setIsLoading(true);
    try {
      const arrays = buildBackendArrays();
      await dispatch(
        createChannel({
          groupId,
          name,
          layout,
          ...arrays,
          sectionId,
          isReadOnly,
          notificationSetting,
        }),
      ).unwrap();
      showToast.success(`Channel #${name} created!`);
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to create channel.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-[rgba(4,6,12,0.7)] backdrop-blur-md">
      <div
        className="w-full max-w-[540px] sm:max-w-[720px] h-[85vh] max-h-[640px] bg-[rgba(20,24,38,0.88)] border border-[rgba(255,255,255,0.08)] backdrop-blur-[30px] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden animate-slide-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-theme-primary leading-tight">
              Create Channel
            </h2>
            <p className="m-0 mt-1 text-[12px] text-theme-muted">
              In <strong className="text-theme-secondary">{groupName}</strong>
            </p>
          </div>
          <button
            id="close-create-channel-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-theme-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-theme-primary transition-colors active-press"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5 min-h-0"
        >
          {/* Channel Name */}
          <div>
            <label
              htmlFor="channel-name-input"
              className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2"
            >
              Channel Name <span className="text-(--danger)">*</span>
            </label>

            <div className="relative flex items-center">
              <span className="absolute left-3 text-theme-muted pointer-events-none flex items-center">
                <IconHash />
              </span>
              <input
                id="channel-name-input"
                type="text"
                value={channelName}
                onChange={handleNameChange}
                placeholder="new-channel"
                maxLength={80}
                required
                autoFocus
                className="input-base w-full py-2.5 pl-9 pr-3.5 rounded-[10px] bg-theme-input border-[1.5px] border-glass text-theme-primary text-sm box-border font-mono focus:outline-none focus:border-(--accent-primary) focus:ring-[2.5px] focus:ring-(--accent-ring)"
              />
            </div>
            <p className="m-0 mt-1.5 text-[11px] text-theme-muted">
              Channel names must be lowercase, with no spaces. Spaces become
              dashes.
            </p>
          </div>

          {/* Channel Type Layout */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2">
              Channel Type
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label
                className={`flex-1 flex flex-col p-3 rounded-[10px] border-[1.5px] cursor-pointer transition-all ${
                  layout === 'text'
                    ? 'border-(--accent-primary) bg-[rgba(114,137,218,0.06)]'
                    : 'border-glass bg-transparent'
                }`}
              >
                <input
                  type="radio"
                  name="channelLayout"
                  value="text"
                  checked={layout === 'text'}
                  onChange={() => setLayout('text')}
                  className="hidden"
                />
                <span className="text-sm font-semibold text-theme-primary">
                  Text Channel
                </span>
                <span className="text-xs text-theme-muted mt-1">
                  Classic flat feed
                </span>
              </label>

              <label
                className={`flex-1 flex flex-col p-3 rounded-[10px] border-[1.5px] cursor-pointer transition-all ${
                  layout === 'bubble'
                    ? 'border-(--accent-primary) bg-[rgba(114,137,218,0.06)]'
                    : 'border-glass bg-transparent'
                }`}
              >
                <input
                  type="radio"
                  name="channelLayout"
                  value="bubble"
                  checked={layout === 'bubble'}
                  onChange={() => setLayout('bubble')}
                  className="hidden"
                />
                <span className="text-sm font-semibold text-theme-primary">
                  Conversation Channel
                </span>
                <span className="text-xs text-theme-muted mt-1">
                  WhatsApp-style bubble feed
                </span>
              </label>

              <label
                className={`flex-1 flex flex-col p-3 rounded-[10px] border-[1.5px] cursor-pointer transition-all ${
                  layout === 'voice'
                    ? 'border-(--accent-primary) bg-[rgba(114,137,218,0.06)]'
                    : 'border-glass bg-transparent'
                }`}
              >
                <input
                  type="radio"
                  name="channelLayout"
                  value="voice"
                  checked={layout === 'voice'}
                  onChange={() => setLayout('voice')}
                  className="hidden"
                />
                <span className="text-sm font-semibold text-theme-primary">
                  Voice Channel
                </span>
                <span className="text-xs text-theme-muted mt-1">
                  Interactive voice room
                </span>
              </label>
            </div>
          </div>

          {/* Advanced Permissions Panel */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.08)]">
            <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
              <h3 className="m-0 text-[12px] font-bold uppercase tracking-wider text-theme-muted">
                Advanced Permissions
              </h3>
              <p className="m-0 mt-1 text-[11px] text-[rgba(255,255,255,0.3)]">
                Add roles or members to set specific permissions. By default,
                everyone is listed.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row h-[280px]">
              {/* Left: Override list */}
              <div
                className="w-full sm:w-[200px] flex-shrink-0 border-r border-[rgba(255,255,255,0.06)] flex flex-col min-h-0"
                style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
              >
                {/* Add button */}
                <div className="p-2 relative">
                  <button
                    type="button"
                    onClick={() => setShowAddDropdown(!showAddDropdown)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-[rgba(255,255,255,0.12)] bg-transparent text-[11px] font-medium text-[rgba(255,255,255,0.4)] cursor-pointer hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all"
                  >
                    <IconUserPlus size={12} />
                    Add role / member
                  </button>
                  {showAddDropdown && (
                    <AddOverrideDropdown
                      roles={roles}
                      members={members}
                      existingIds={existingOverrideIds}
                      onAdd={handleAddOverride}
                      onClose={() => setShowAddDropdown(false)}
                    />
                  )}
                </div>

                {/* Override chips */}
                <div className="flex-1 overflow-y-auto px-1.5 pb-2">
                  <div className="flex flex-col gap-0.5">
                    {/* Role overrides */}
                    {overrides.filter((o) => o.type === 'role').length > 0 && (
                      <>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.25)] px-2.5 pt-2 pb-1">
                          Roles
                        </span>
                        {overrides
                          .filter((o) => o.type === 'role')
                          .map((o) => (
                            <OverrideChip
                              key={`role-${o.id}`}
                              override={o}
                              roles={roles}
                              members={members}
                              isSelected={
                                selectedOverrideKey === `role-${o.id}`
                              }
                              onClick={() =>
                                setSelectedOverrideKey(`role-${o.id}`)
                              }
                              onRemove={() =>
                                handleRemoveOverride(`role-${o.id}`)
                              }
                            />
                          ))}
                      </>
                    )}
                    {/* Member overrides */}
                    {overrides.filter((o) => o.type === 'member').length >
                      0 && (
                      <>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.25)] px-2.5 pt-2 pb-1">
                          Members
                        </span>
                        {overrides
                          .filter((o) => o.type === 'member')
                          .map((o) => (
                            <OverrideChip
                              key={`member-${o.id}`}
                              override={o}
                              roles={roles}
                              members={members}
                              isSelected={
                                selectedOverrideKey === `member-${o.id}`
                              }
                              onClick={() =>
                                setSelectedOverrideKey(`member-${o.id}`)
                              }
                              onRemove={() =>
                                handleRemoveOverride(`member-${o.id}`)
                              }
                            />
                          ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Permission details */}
              <div className="flex-1 p-4 overflow-y-auto bg-[rgba(0,0,0,0.04)] sm:bg-transparent min-h-0">
                {selectedOverride ? (
                  <div className="flex flex-col gap-4">
                    {/* Header for selected */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-[rgba(255,255,255,0.06)]">
                      <div className="flex items-center gap-2">
                        {selectedOverride.type === 'role' &&
                        selectedOverride.id !== 'everyone' ? (
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                roles.find((r) => r.id === selectedOverride.id)
                                  ?.color || '#99aab5',
                            }}
                          />
                        ) : null}
                        <span className="text-[13px] font-semibold text-theme-primary">
                          {selectedOverride.type === 'role'
                            ? selectedOverride.id === 'everyone'
                              ? '@everyone'
                              : roles.find((r) => r.id === selectedOverride.id)
                                  ?.name || selectedOverride.id
                            : (() => {
                                const m = members.find(
                                  (m) => m.userId === selectedOverride.id,
                                );
                                return (
                                  m?.user?.displayName ||
                                  m?.user?.username ||
                                  m?.user?.email ||
                                  selectedOverride.id
                                );
                              })()}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-[rgba(255,255,255,0.25)] font-bold ml-1">
                          {selectedOverride.id === 'everyone'
                            ? 'default role'
                            : selectedOverride.type}
                        </span>
                      </div>
                    </div>

                    {/* Permission rows */}
                    <div className="flex flex-col gap-2.5">
                      {/* View Channel */}
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="w-5 h-5 flex items-center justify-center text-[rgba(255,255,255,0.35)] shrink-0">
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <span className="text-[12.5px] font-medium text-theme-primary block">
                              View Channel
                            </span>
                            <p className="m-0 text-[10.5px] text-[rgba(255,255,255,0.3)]">
                              Allows seeing this channel
                            </p>
                          </div>
                        </div>
                        <TriStateToggle
                          value={selectedOverride.viewChannel}
                          onChange={(val) =>
                            handleUpdateOverride(
                              `${selectedOverride.type}-${selectedOverride.id}`,
                              'viewChannel',
                              val,
                            )
                          }
                        />
                      </div>

                      {/* Send Messages */}
                      <div className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="w-5 h-5 flex items-center justify-center text-[rgba(255,255,255,0.35)] shrink-0">
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <span className="text-[12.5px] font-medium text-theme-primary block">
                              Send Messages
                            </span>
                            <p className="m-0 text-[10.5px] text-[rgba(255,255,255,0.3)]">
                              Allows sending messages in this channel
                            </p>
                          </div>
                        </div>
                        <TriStateToggle
                          value={selectedOverride.sendMessages}
                          onChange={(val) =>
                            handleUpdateOverride(
                              `${selectedOverride.type}-${selectedOverride.id}`,
                              'sendMessages',
                              val,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.04)] flex items-center justify-center mb-2.5 text-[rgba(255,255,255,0.15)]">
                      <IconLock size={20} />
                    </div>
                    <p className="m-0 text-[12px] text-[rgba(255,255,255,0.3)] max-w-[180px]">
                      Select a role or member to configure permissions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Channel Notification Setting */}
          <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] flex flex-col gap-3">
            <div>
              <span className="text-sm font-semibold text-theme-primary">
                Channel Notification Setting
              </span>
              <p className="m-0 mt-0.5 text-xs text-theme-muted">
                Choose the default notification behavior for messages sent in
                this channel
              </p>
            </div>
            <select
              value={notificationSetting}
              onChange={(e) =>
                setNotificationSetting(
                  e.target.value as 'all' | 'mention' | 'none',
                )
              }
              style={{
                background: 'var(--bg-input, #1e1f22)',
                borderColor: 'var(--glass-border, rgba(255,255,255,0.08))',
                color: 'var(--text-primary)',
              }}
              className="w-full py-2 px-3 rounded-lg border text-sm focus:outline-none focus:border-[var(--accent-primary)] font-medium"
            >
              <option value="all">All Notifications</option>
              <option value="mention">Only Mentions</option>
              <option value="none">None</option>
            </select>
          </div>
        </form>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t border-[rgba(255,255,255,0.06)] flex justify-end gap-2.5 flex-shrink-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-md border-none bg-transparent text-[13px] font-medium text-theme-secondary cursor-pointer hover:underline"
          >
            Cancel
          </button>
          <button
            id="create-channel-submit-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !channelName.trim()}
            className="px-6 py-2 rounded-md border-none text-[13px] font-semibold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all active-press"
            style={{
              background: 'linear-gradient(135deg, #5865f2, #4752c4)',
              boxShadow: '0 2px 12px rgba(88, 101, 242, 0.3)',
            }}
          >
            {isLoading ? 'Creating…' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
};
