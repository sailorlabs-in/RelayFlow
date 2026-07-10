/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React, { useState, useMemo, useRef, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type {
  GroupChannel,
  GroupRole,
  GroupMember,
} from '../store/slices/groupsSlice';
import { updateChannel, deleteChannel } from '../store/slices/groupsSlice';

import { IconX, IconHash, IconLock, IconUserPlus } from './Icons';
import { showToast } from './toast';
import { ConfirmationModal } from './ConfirmationModal';

// ─── Types ──────────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'permissions';

interface PermissionOverride {
  id: string;
  type: 'role' | 'member';
  viewChannel: 'allow' | 'deny' | 'neutral'; // For private channel
  sendMessages: 'allow' | 'deny' | 'neutral'; // For read-only channel
}

interface ChannelSettingsModalProps {
  groupId: string;
  channel: GroupChannel;
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
      className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all duration-150 ${
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
      {/* Icon or avatar */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={{
          backgroundColor: color ? `${color}22` : 'rgba(255,255,255,0.08)',
          color: color || 'var(--text-secondary)',
        }}
      >
        {override.type === 'role' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
        ) : member?.user?.avatarThumbnailUrl || member?.user?.avatarUrl ? (
          <img
            src={member.user.avatarThumbnailUrl || member.user.avatarUrl}
            alt=""
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <span>{displayName.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <span
        className="text-[13px] font-medium truncate flex-1"
        style={{ color: color || 'var(--text-primary)' }}
      >
        {displayName}
      </span>

      {/* Remove button */}
      {override.id !== 'everyone' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="md:opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded bg-transparent border-none cursor-pointer text-[rgba(255,255,255,0.3)] hover:text-[#ed4245] transition-all"
        >
          <IconX size={10} />
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
      {/* Search */}
      <div className="p-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          autoFocus
          className="w-full py-2 px-3 rounded-md text-sm box-border focus:outline-none border-none text-theme-primary bg-theme-input"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[rgba(255,255,255,0.06)]">
        <button
          type="button"
          onClick={() => setSection('roles')}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider border-none cursor-pointer transition-all ${
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
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider border-none cursor-pointer transition-all ${
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

      {/* Items */}
      <div className="max-h-40 overflow-y-auto p-1.5">
        {section === 'roles' ? (
          filteredRoles.length === 0 ? (
            <div className="py-3 text-center text-xs text-[rgba(255,255,255,0.3)]">
              No roles available
            </div>
          ) : (
            filteredRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => onAdd(role.id, 'role')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md bg-transparent border-none cursor-pointer text-left hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: role.color || '#99aab5' }}
                />
                <span
                  className="text-[13px] font-medium"
                  style={{ color: role.color || 'var(--text-primary)' }}
                >
                  {role.name}
                </span>
              </button>
            ))
          )
        ) : filteredMembers.length === 0 ? (
          <div className="py-3 text-center text-xs text-[rgba(255,255,255,0.3)]">
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
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md bg-transparent border-none cursor-pointer text-left hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                {m.user?.avatarThumbnailUrl || m.user?.avatarUrl ? (
                  <img
                    src={m.user.avatarThumbnailUrl || m.user.avatarUrl}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[9px] font-bold text-[rgba(255,255,255,0.5)] flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[13px] text-theme-primary truncate">
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
export const ChannelSettingsModal = ({
  groupId,
  channel,
  onClose,
}: ChannelSettingsModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();

  const group = useAppSelector((state) =>
    state.groups.groups.find((g) => g.id === groupId),
  );
  const roles = group?.roles || [];
  const members = group?.members || [];

  // ── Mobile state ──
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Active tab (can be null on mobile to show tab menu) ──
  const [activeTab, setActiveTab] = useState<TabId | null>('overview');

  useEffect(() => {
    if (isMobile) {
      setActiveTab(null); // start on menu list for mobile
    } else {
      setActiveTab('overview'); // reset to overview on desktop
    }
  }, [isMobile]);

  // ── Overview fields ──
  const [name, setName] = useState(channel.name);
  const [notificationSetting, setNotificationSetting] = useState<
    'all' | 'mention' | 'none'
  >(channel.notificationSetting || 'all');

  // ── Permission Overrides ──
  const [overrides, setOverrides] = useState<PermissionOverride[]>(() => {
    const map = new Map<string, PermissionOverride>();

    // Always ensure @everyone override exists by default
    map.set('role-everyone', {
      id: 'everyone',
      type: 'role',
      viewChannel: 'neutral',
      sendMessages: 'neutral',
    });

    // Build from existing channel data
    [...(channel.allowedRoleIds || []), ...(channel.readRoleIds || [])].forEach(
      (id) => {
        if (!map.has(`role-${id}`)) {
          map.set(`role-${id}`, {
            id,
            type: 'role',
            viewChannel: 'allow',
            sendMessages: 'neutral',
          });
        } else {
          map.get(`role-${id}`)!.viewChannel = 'allow';
        }
      },
    );

    (channel.hiddenFromRoleIds || []).forEach((id) => {
      if (!map.has(`role-${id}`)) {
        map.set(`role-${id}`, {
          id,
          type: 'role',
          viewChannel: 'deny',
          sendMessages: 'neutral',
        });
      } else {
        map.get(`role-${id}`)!.viewChannel = 'deny';
      }
    });

    (channel.writeRoleIds || []).forEach((id) => {
      if (!map.has(`role-${id}`)) {
        map.set(`role-${id}`, {
          id,
          type: 'role',
          viewChannel: 'neutral',
          sendMessages: 'allow',
        });
      } else {
        map.get(`role-${id}`)!.sendMessages = 'allow';
      }
    });

    (channel.denyWriteRoleIds || []).forEach((id) => {
      if (!map.has(`role-${id}`)) {
        map.set(`role-${id}`, {
          id,
          type: 'role',
          viewChannel: 'neutral',
          sendMessages: 'deny',
        });
      } else {
        map.get(`role-${id}`)!.sendMessages = 'deny';
      }
    });

    (channel.readUserIds || []).forEach((id) => {
      if (!map.has(`member-${id}`)) {
        map.set(`member-${id}`, {
          id,
          type: 'member',
          viewChannel: 'allow',
          sendMessages: 'neutral',
        });
      } else {
        map.get(`member-${id}`)!.viewChannel = 'allow';
      }
    });

    (channel.hiddenFromUserIds || []).forEach((id) => {
      if (!map.has(`member-${id}`)) {
        map.set(`member-${id}`, {
          id,
          type: 'member',
          viewChannel: 'deny',
          sendMessages: 'neutral',
        });
      } else {
        map.get(`member-${id}`)!.viewChannel = 'deny';
      }
    });

    (channel.writeUserIds || []).forEach((id) => {
      if (!map.has(`member-${id}`)) {
        map.set(`member-${id}`, {
          id,
          type: 'member',
          viewChannel: 'neutral',
          sendMessages: 'allow',
        });
      } else {
        map.get(`member-${id}`)!.sendMessages = 'allow';
      }
    });

    (channel.denyWriteUserIds || []).forEach((id) => {
      if (!map.has(`member-${id}`)) {
        map.set(`member-${id}`, {
          id,
          type: 'member',
          viewChannel: 'neutral',
          sendMessages: 'deny',
        });
      } else {
        map.get(`member-${id}`)!.sendMessages = 'deny';
      }
    });

    return Array.from(map.values());
  });

  const [selectedOverrideKey, setSelectedOverrideKey] = useState<string | null>(
    'role-everyone',
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // ── Loading/Deleting state ──
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
  } | null>(null);

  // ── Derived: selected override ──
  const selectedOverride = useMemo(() => {
    if (!selectedOverrideKey) {
      return null;
    }
    return (
      overrides.find((o) => `${o.type}-${o.id}` === selectedOverrideKey) || null
    );
  }, [overrides, selectedOverrideKey]);

  // ── Derived: existing override IDs (for add dropdown exclusion) ──
  const existingOverrideIds = useMemo(() => {
    const set = new Set<string>();
    overrides.forEach((o) => set.add(o.id));
    return set;
  }, [overrides]);

  const isPrivate = useMemo(() => {
    const everyoneOverride = overrides.find(
      (o) => o.id === 'everyone' && o.type === 'role',
    );
    return everyoneOverride?.viewChannel === 'deny';
  }, [overrides]);

  // ── Handlers ──
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.toLowerCase().replace(/\s+/g, '-'));
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
      setSelectedOverrideKey(null);
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

  // ── Convert overrides back to backend arrays ──
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

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showToast.error('Please enter a channel name.');
      return;
    }
    if (channel.name === 'general') {
      showToast.error('Cannot rename the general channel.');
      return;
    }
    setIsLoading(true);
    try {
      const arrays = buildBackendArrays();
      await dispatch(
        updateChannel({
          groupId,
          channelId: channel.id,
          name: cleanName,
          ...arrays,
          notificationSetting,
        }),
      ).unwrap();
      showToast.success('Channel configurations updated!');
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to update channel.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (channel.name === 'general') {
      showToast.error('Cannot delete the general channel.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Channel',
      message: `Are you sure you want to delete channel #${channel.name}? This will permanently erase all message history in this channel.`,
      confirmLabel: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        setConfirmModal(null);
        try {
          await dispatch(
            deleteChannel({ groupId, channelId: channel.id }),
          ).unwrap();
          showToast.success(`Channel #${channel.name} deleted.`);
          onClose();
        } catch (err: any) {
          showToast.error(err || 'Failed to delete channel.');
          setIsDeleting(false);
        }
      },
    });
  };

  // ── Change detection ──
  const isModified = useMemo(() => {
    if (name !== channel.name) {
      return true;
    }
    if (notificationSetting !== (channel.notificationSetting || 'all')) {
      return true;
    }

    const arrays = buildBackendArrays();
    const compare = (a: string[], b: string[] | undefined) =>
      JSON.stringify([...a].sort()) !== JSON.stringify([...(b || [])].sort());

    if (compare(arrays.allowedRoleIds, channel.allowedRoleIds)) {
      return true;
    }
    if (compare(arrays.readRoleIds, channel.readRoleIds)) {
      return true;
    }
    if (compare(arrays.writeRoleIds, channel.writeRoleIds)) {
      return true;
    }
    if (compare(arrays.hiddenFromUserIds, channel.hiddenFromUserIds)) {
      return true;
    }
    if (compare(arrays.hiddenFromRoleIds, channel.hiddenFromRoleIds)) {
      return true;
    }
    if (compare(arrays.readUserIds, channel.readUserIds)) {
      return true;
    }
    if (compare(arrays.writeUserIds, channel.writeUserIds)) {
      return true;
    }
    if (compare(arrays.denyWriteRoleIds, channel.denyWriteRoleIds)) {
      return true;
    }
    if (compare(arrays.denyWriteUserIds, channel.denyWriteUserIds)) {
      return true;
    }

    return false;
  }, [name, notificationSetting, overrides, channel]);

  const isGeneralChannel = channel.name === 'general';

  const showMobileBack = isMobile && activeTab !== null;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4 sm:p-4 bg-[rgba(4,6,12,0.7)] backdrop-blur-md">
      <div
        className="w-full max-w-[540px] sm:max-w-[720px] h-[80vh] max-h-[680px] bg-[rgba(20,24,38,0.88)] border border-[rgba(255,255,255,0.08)] backdrop-blur-[30px] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden animate-slide-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {showMobileBack && (
              <button
                type="button"
                onClick={() => {
                  if (
                    activeTab === 'permissions' &&
                    selectedOverrideKey !== null
                  ) {
                    setSelectedOverrideKey(null);
                  } else {
                    setActiveTab(null);
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-theme-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-theme-primary transition-colors shrink-0"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-1.5 text-theme-muted">
              {isPrivate ? <IconLock size={14} /> : <IconHash />}
            </div>
            <div>
              <h2 className="m-0 text-[16px] font-bold text-theme-primary leading-tight">
                {isMobile
                  ? activeTab === 'overview'
                    ? 'Overview'
                    : activeTab === 'permissions'
                      ? selectedOverrideKey
                        ? 'Edit Override'
                        : 'Permissions'
                      : channel.name
                  : channel.name}
              </h2>
              <p className="m-0 text-[11px] text-theme-muted">
                {isMobile && activeTab === null
                  ? 'Channel Settings'
                  : `#${channel.name}`}
              </p>
            </div>
          </div>
          <button
            id="close-channel-settings-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-theme-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-theme-primary transition-colors active-press"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* ── Content Area ── */}
        <div className="flex flex-1 overflow-hidden min-h-0 flex-col sm:flex-row">
          {/* ── Tab Sidebar ── */}
          {(!isMobile || activeTab === null) && (
            <div
              className="w-full sm:w-[180px] flex-shrink-0 border-b sm:border-b-0 sm:border-r border-[rgba(255,255,255,0.06)] py-3 px-2 flex flex-col gap-0.5 overflow-y-auto"
              style={{ backgroundColor: 'rgba(0,0,0,0.12)' }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-3 py-2.5 sm:py-2 rounded-md text-[13px] font-medium border-none cursor-pointer transition-all ${
                  activeTab === 'overview'
                    ? 'bg-[rgba(255,255,255,0.1)] text-theme-primary'
                    : 'bg-transparent text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[rgba(255,255,255,0.7)]'
                }`}
              >
                Overview
              </button>

              {!isGeneralChannel && (
                <button
                  type="button"
                  onClick={() => setActiveTab('permissions')}
                  className={`w-full text-left px-3 py-2.5 sm:py-2 rounded-md text-[13px] font-medium border-none cursor-pointer transition-all ${
                    activeTab === 'permissions'
                      ? 'bg-[rgba(255,255,255,0.1)] text-theme-primary'
                      : 'bg-transparent text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[rgba(255,255,255,0.7)]'
                  }`}
                >
                  Permissions
                </button>
              )}

              {!isGeneralChannel && (
                <>
                  <div className="mx-2 my-2 border-t border-[rgba(255,255,255,0.06)] hidden sm:block" />
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full text-left px-3 py-2.5 sm:py-2 rounded-md text-[13px] font-medium border-none cursor-pointer transition-all bg-transparent text-[#ed4245] hover:bg-[rgba(237,66,69,0.1)] disabled:opacity-50 mt-auto sm:mt-0"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete Channel'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Main Tab Content ── */}
          {activeTab !== null && (
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* ====== OVERVIEW TAB ====== */}
              {activeTab === 'overview' && (
                <div className="p-4 sm:p-5 flex flex-col gap-5">
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
                        {isPrivate ? <IconLock size={14} /> : <IconHash />}
                      </span>
                      <input
                        id="channel-name-input"
                        type="text"
                        value={name}
                        onChange={handleNameChange}
                        placeholder="channel-name"
                        maxLength={80}
                        required
                        disabled={isGeneralChannel}
                        className="input-base w-full py-2.5 pl-9 pr-3.5 rounded-[10px] bg-theme-input border-[1.5px] border-glass text-theme-primary text-sm box-border font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Notification Setting */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2">
                      Notification Setting
                    </label>
                    <p className="m-0 mb-2 text-[12px] text-[rgba(255,255,255,0.35)]">
                      Choose the default notification behavior for this channel
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {(['all', 'mention', 'none'] as const).map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                            notificationSetting === opt
                              ? 'bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)]'
                              : 'bg-transparent border border-transparent hover:bg-[rgba(255,255,255,0.03)]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="notification-setting"
                            value={opt}
                            checked={notificationSetting === opt}
                            onChange={() => setNotificationSetting(opt)}
                            className="sr-only"
                          />
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              notificationSetting === opt
                                ? 'border-[var(--accent-primary)]'
                                : 'border-[rgba(255,255,255,0.2)]'
                            }`}
                          >
                            {notificationSetting === opt && (
                              <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                            )}
                          </div>
                          <div>
                            <span className="text-[13px] font-medium text-theme-primary">
                              {opt === 'all'
                                ? 'All Messages'
                                : opt === 'mention'
                                  ? 'Only @mentions'
                                  : 'Nothing'}
                            </span>
                            <p className="m-0 text-[11px] text-[rgba(255,255,255,0.3)]">
                              {opt === 'all'
                                ? 'Get notified for every new message'
                                : opt === 'mention'
                                  ? 'Only when someone mentions you'
                                  : 'Mute all notifications for this channel'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ====== PERMISSIONS TAB ====== */}
              {activeTab === 'permissions' && !isGeneralChannel && (
                <div className="p-4 sm:p-5 flex flex-col gap-5">
                  <div className="rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                      <h3 className="m-0 text-[13px] font-bold uppercase tracking-wider text-theme-muted">
                        Advanced Permissions
                      </h3>
                      <p className="m-0 mt-1 text-[11px] text-[rgba(255,255,255,0.3)]">
                        Add roles or members to set specific permissions. By
                        default, everyone is listed.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row min-h-[260px]">
                      {/* Left: Override list */}
                      {(!isMobile || selectedOverrideKey === null) && (
                        <div
                          className="w-full sm:w-[200px] flex-shrink-0 border-r border-[rgba(255,255,255,0.06)] flex flex-col"
                          style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
                        >
                          {/* Add button */}
                          <div className="p-2 relative">
                            <button
                              type="button"
                              onClick={() =>
                                setShowAddDropdown(!showAddDropdown)
                              }
                              className="w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-md border border-dashed border-[rgba(255,255,255,0.12)] bg-transparent text-[12px] font-medium text-[rgba(255,255,255,0.4)] cursor-pointer hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all"
                            >
                              <IconUserPlus size={14} />
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
                              {overrides.filter((o) => o.type === 'role')
                                .length > 0 && (
                                <>
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.25)] px-3 pt-2 pb-1">
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
                              {overrides.filter((o) => o.type === 'member')
                                .length > 0 && (
                                <>
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-[rgba(255,255,255,0.25)] px-3 pt-2 pb-1">
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
                                          selectedOverrideKey ===
                                          `member-${o.id}`
                                        }
                                        onClick={() =>
                                          setSelectedOverrideKey(
                                            `member-${o.id}`,
                                          )
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
                      )}

                      {/* Right: Permission details */}
                      {(!isMobile || selectedOverrideKey !== null) && (
                        <div className="flex-1 p-4 bg-[rgba(0,0,0,0.04)] sm:bg-transparent">
                          {selectedOverride ? (
                            <div className="flex flex-col gap-4">
                              {/* Header for selected */}
                              <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)]">
                                <div className="flex items-center gap-2">
                                  {selectedOverride.type === 'role' &&
                                  selectedOverride.id !== 'everyone' ? (
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{
                                        backgroundColor:
                                          roles.find(
                                            (r) => r.id === selectedOverride.id,
                                          )?.color || '#99aab5',
                                      }}
                                    />
                                  ) : null}
                                  <span className="text-[14px] font-semibold text-theme-primary">
                                    {selectedOverride.type === 'role'
                                      ? selectedOverride.id === 'everyone'
                                        ? '@everyone'
                                        : roles.find(
                                            (r) => r.id === selectedOverride.id,
                                          )?.name || selectedOverride.id
                                      : (() => {
                                          const m = members.find(
                                            (m) =>
                                              m.userId === selectedOverride.id,
                                          );
                                          return (
                                            m?.user?.displayName ||
                                            m?.user?.username ||
                                            m?.user?.email ||
                                            selectedOverride.id
                                          );
                                        })()}
                                  </span>
                                  <span className="text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.25)] font-semibold ml-1">
                                    {selectedOverride.id === 'everyone'
                                      ? 'default role'
                                      : selectedOverride.type}
                                  </span>
                                </div>

                                {isMobile &&
                                  selectedOverride.id !== 'everyone' && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveOverride(
                                          `${selectedOverride.type}-${selectedOverride.id}`,
                                        )
                                      }
                                      className="text-xs text-[#ed4245] font-semibold border-none bg-transparent cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  )}
                              </div>

                              {/* Permission rows */}
                              <div className="flex flex-col gap-3">
                                {/* View Channel */}
                                <div className="flex items-center justify-between py-2">
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <span className="w-5 h-5 flex items-center justify-center text-[rgba(255,255,255,0.35)] shrink-0">
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                      </svg>
                                    </span>
                                    <div className="min-w-0">
                                      <span className="text-[13px] font-medium text-theme-primary block">
                                        View Channel
                                      </span>
                                      <p className="m-0 text-[11px] text-[rgba(255,255,255,0.3)] truncate sm:whitespace-normal">
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
                                <div className="flex items-center justify-between py-2">
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <span className="w-5 h-5 flex items-center justify-center text-[rgba(255,255,255,0.35)] shrink-0">
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                      </svg>
                                    </span>
                                    <div className="min-w-0">
                                      <span className="text-[13px] font-medium text-theme-primary block">
                                        Send Messages
                                      </span>
                                      <p className="m-0 text-[11px] text-[rgba(255,255,255,0.3)] truncate sm:whitespace-normal">
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
                              <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.04)] flex items-center justify-center mb-3 text-[rgba(255,255,255,0.15)]">
                                <IconLock size={24} />
                              </div>
                              <p className="m-0 text-[13px] text-[rgba(255,255,255,0.3)] max-w-[200px]">
                                Select a role or member to configure permissions
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer / Save bar ── */}
        {isModified && (
          <div
            className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between flex-shrink-0 animate-slide-up"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
          >
            <span className="text-[12px] text-[rgba(255,255,255,0.4)] hidden sm:inline">
              Careful — you have unsaved changes!
            </span>
            <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setName(channel.name);
                  setNotificationSetting(channel.notificationSetting || 'all');
                  // Re-initialize overrides from channel original settings
                  const map = new Map<string, PermissionOverride>();
                  map.set('role-everyone', {
                    id: 'everyone',
                    type: 'role',
                    viewChannel: 'neutral',
                    sendMessages: 'neutral',
                  });
                  [
                    ...(channel.allowedRoleIds || []),
                    ...(channel.readRoleIds || []),
                  ].forEach((id) => {
                    if (!map.has(`role-${id}`)) {
                      map.set(`role-${id}`, {
                        id,
                        type: 'role',
                        viewChannel: 'allow',
                        sendMessages: 'neutral',
                      });
                    } else {
                      map.get(`role-${id}`)!.viewChannel = 'allow';
                    }
                  });
                  (channel.hiddenFromRoleIds || []).forEach((id) => {
                    if (!map.has(`role-${id}`)) {
                      map.set(`role-${id}`, {
                        id,
                        type: 'role',
                        viewChannel: 'deny',
                        sendMessages: 'neutral',
                      });
                    } else {
                      map.get(`role-${id}`)!.viewChannel = 'deny';
                    }
                  });
                  (channel.writeRoleIds || []).forEach((id) => {
                    if (!map.has(`role-${id}`)) {
                      map.set(`role-${id}`, {
                        id,
                        type: 'role',
                        viewChannel: 'neutral',
                        sendMessages: 'allow',
                      });
                    } else {
                      map.get(`role-${id}`)!.sendMessages = 'allow';
                    }
                  });
                  (channel.denyWriteRoleIds || []).forEach((id) => {
                    if (!map.has(`role-${id}`)) {
                      map.set(`role-${id}`, {
                        id,
                        type: 'role',
                        viewChannel: 'neutral',
                        sendMessages: 'deny',
                      });
                    } else {
                      map.get(`role-${id}`)!.sendMessages = 'deny';
                    }
                  });
                  (channel.readUserIds || []).forEach((id) => {
                    if (!map.has(`member-${id}`)) {
                      map.set(`member-${id}`, {
                        id,
                        type: 'member',
                        viewChannel: 'allow',
                        sendMessages: 'neutral',
                      });
                    } else {
                      map.get(`member-${id}`)!.viewChannel = 'allow';
                    }
                  });
                  (channel.hiddenFromUserIds || []).forEach((id) => {
                    if (!map.has(`member-${id}`)) {
                      map.set(`member-${id}`, {
                        id,
                        type: 'member',
                        viewChannel: 'deny',
                        sendMessages: 'neutral',
                      });
                    } else {
                      map.get(`member-${id}`)!.viewChannel = 'deny';
                    }
                  });
                  (channel.writeUserIds || []).forEach((id) => {
                    if (!map.has(`member-${id}`)) {
                      map.set(`member-${id}`, {
                        id,
                        type: 'member',
                        viewChannel: 'neutral',
                        sendMessages: 'allow',
                      });
                    } else {
                      map.get(`member-${id}`)!.sendMessages = 'allow';
                    }
                  });
                  (channel.denyWriteUserIds || []).forEach((id) => {
                    if (!map.has(`member-${id}`)) {
                      map.set(`member-${id}`, {
                        id,
                        type: 'member',
                        viewChannel: 'neutral',
                        sendMessages: 'deny',
                      });
                    } else {
                      map.get(`member-${id}`)!.sendMessages = 'deny';
                    }
                  });
                  setOverrides(Array.from(map.values()));
                  setSelectedOverrideKey('role-everyone');
                }}
                className="px-4 py-2.5 sm:py-2 rounded-md border-none bg-transparent text-[13px] font-medium text-theme-secondary cursor-pointer hover:underline"
              >
                Reset
              </button>
              <button
                id="channel-settings-save-btn"
                type="button"
                onClick={handleSave}
                disabled={isLoading || !name.trim()}
                className="px-5 py-2.5 sm:py-2 rounded-md border-none text-[13px] font-semibold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all flex-1 sm:flex-initial text-center justify-center flex items-center"
                style={{
                  background: 'linear-gradient(135deg, #3ba55d, #2d7d46)',
                  boxShadow: '0 2px 12px rgba(59, 165, 93, 0.3)',
                }}
              >
                {isLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmModal && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
};
