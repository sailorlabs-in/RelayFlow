export interface GroupRole {
  id: string;
  groupId: string;
  name: string;
  color: string;
  permissions?: string[];
  priority?: number;
  colorPriority?: number;
  hierarchyPriority?: number;
  createdAt: string;
}

export const sortRoles = (roles: GroupRole[]) => {
  return [...roles].sort((a, b) => {
    const hpA = a.hierarchyPriority ?? a.priority ?? 1000000;
    const hpB = b.hierarchyPriority ?? b.priority ?? 1000000;
    if (hpA !== hpB) {
      return hpA - hpB;
    }

    // Sort by colorPriority ASC, but 0/unset goes to the end
    const cpA = a.colorPriority ?? 0;
    const cpB = b.colorPriority ?? 0;
    if (cpA !== cpB) {
      if (cpA <= 0) {
        return 1;
      }
      if (cpB <= 0) {
        return -1;
      }
      return cpA - cpB;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
};

export interface GroupSection {
  id: string;
  groupId: string;
  name: string;
  position: number;
  allowedRoleIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupChannel {
  id: string;
  name: string;
  groupId: string;
  type: 'channel';
  layout: 'text' | 'bubble' | 'voice';
  allowedRoleIds?: string[];
  readRoleIds?: string[];
  writeRoleIds?: string[];
  hiddenFromUserIds?: string[];
  hiddenFromRoleIds?: string[];
  readUserIds?: string[];
  writeUserIds?: string[];
  denyWriteRoleIds?: string[];
  denyWriteUserIds?: string[];
  isReadOnly?: boolean;
  notificationSetting?: 'all' | 'mention' | 'none';
  createdAt: string;
  updatedAt: string;
  sectionId?: string;
  position: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  roleIds?: string[];
  permissions?: string[];
  isMuted?: boolean;
  notificationPref?: 'all' | 'mention' | 'none';
  isGhost?: boolean;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    avatarThumbnailUrl?: string;
    status?: string;
    role?: string;
  };
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  iconLetter: string;
  avatarUrl?: string;
  avatarThumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  channels: GroupChannel[];
  roles: GroupRole[];
  sections: GroupSection[];
}

export interface GroupsState {
  groups: Group[];
  activeGroupId: string | null;
  activeChannelId: string | null;
  invites: any[];
  isInvitesLoading: boolean;
  isGeneratingInvite: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  activeVoiceChannelId: string | null;
  voiceStates: Record<
    string,
    {
      userId: string;
      groupId: string;
      channelId: string;
      isMuted: boolean;
      isDeafened: boolean;
    }
  >;
}

export const initialGroupsState: GroupsState = {
  groups: [] as Group[],
  activeGroupId: null,
  activeChannelId: null,
  invites: [],
  isInvitesLoading: false,
  isGeneratingInvite: false,
  status: 'idle',
  error: null,
  activeVoiceChannelId: null,
  voiceStates: {},
};
