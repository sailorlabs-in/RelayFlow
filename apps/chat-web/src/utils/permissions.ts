import type {
  Group,
  GroupChannel,
  GroupSection,
} from '../store/slices/groupsSlice';

export const hasGroupPermission = (
  group: Group | undefined,
  userId: string | undefined,
  permission: string,
): boolean => {
  if (!group || !userId) {
    return false;
  }

  const member = group.members.find((m) => m.userId === userId);
  if (!member) {
    return false;
  }

  // Group owner, admin, or platform admin bypass all permission checks
  if (
    member.role === 'owner' ||
    member.role === 'admin' ||
    member.user?.role === 'admin'
  ) {
    return true;
  }

  // Check direct user permission overrides
  if (member.permissions && member.permissions.includes(permission)) {
    return true;
  }

  // Aggregate permissions from user's custom roles
  if (member.roleIds && member.roleIds.length > 0 && group.roles) {
    const assignedRoles = group.roles.filter((role) =>
      member.roleIds?.includes(role.id),
    );
    for (const role of assignedRoles) {
      if (role.permissions && role.permissions.includes(permission)) {
        return true;
      }
    }
  }

  return false;
};

export const canUserAccessSection = (
  group: Group | undefined,
  section: GroupSection | undefined,
  userId: string | undefined,
): boolean => {
  if (!group || !section || !userId) {
    return false;
  }

  const member = group.members.find((m) => m.userId === userId);
  if (!member) {
    return false;
  }

  // Group owner, admin, or manage_group bypasses visibility checks
  if (
    member.role === 'owner' ||
    member.role === 'admin' ||
    hasGroupPermission(group, userId, 'manage_group')
  ) {
    return true;
  }

  const allowedRoles = section.allowedRoleIds || [];
  if (allowedRoles.length === 0) {
    return true;
  }

  const memberRoleIds = member.roleIds || [];
  return allowedRoles.some((roleId) => memberRoleIds.includes(roleId));
};

export const canUserAccessChannel = (
  group: Group | undefined,
  channel: GroupChannel | undefined,
  userId: string | undefined,
): boolean => {
  if (!group || !channel || !userId) {
    return false;
  }

  const member = group.members.find((m) => m.userId === userId);
  if (!member) {
    return false;
  }

  // Group owner, admin, or manage_group/manage_channels bypasses visibility checks
  if (
    member.role === 'owner' ||
    member.role === 'admin' ||
    member.user?.role === 'admin' ||
    hasGroupPermission(group, userId, 'manage_group') ||
    hasGroupPermission(group, userId, 'manage_channels')
  ) {
    return true;
  }

  // Check parent section/category access first
  if (channel.sectionId && group.sections) {
    const section = group.sections.find((s) => s.id === channel.sectionId);
    if (section && !canUserAccessSection(group, section, userId)) {
      return false;
    }
  }

  const hiddenFromUsers = channel.hiddenFromUserIds || [];
  const readUsers = channel.readUserIds || [];
  const writeUsers = channel.writeUserIds || [];

  // 1. User-level overrides (highest priority)
  if (hiddenFromUsers.includes(userId)) {
    return false;
  }
  if (writeUsers.includes(userId) || readUsers.includes(userId)) {
    return true;
  }

  // 2. Role-level evaluation (second priority)
  const memberRoleIds = member.roleIds || [];
  const hiddenFromRoles = channel.hiddenFromRoleIds || [];
  const allowedRoles = channel.allowedRoleIds || [];
  const readRoles = channel.readRoleIds || [];
  const writeRoles = channel.writeRoleIds || [];

  if (memberRoleIds.length > 0 && group.roles) {
    const userRoles = group.roles.filter((role) =>
      memberRoleIds.includes(role.id),
    );
    const sortedRoles = [...userRoles].sort((a, b) => {
      const hpA = a.hierarchyPriority ?? a.priority ?? 1000000;
      const hpB = b.hierarchyPriority ?? b.priority ?? 1000000;
      return hpA - hpB;
    });

    const configuredRole = sortedRoles.find(
      (role) =>
        hiddenFromRoles.includes(role.id) ||
        writeRoles.includes(role.id) ||
        readRoles.includes(role.id) ||
        allowedRoles.includes(role.id),
    );

    if (configuredRole) {
      if (hiddenFromRoles.includes(configuredRole.id)) {
        return false;
      }
      if (
        writeRoles.includes(configuredRole.id) ||
        readRoles.includes(configuredRole.id) ||
        allowedRoles.includes(configuredRole.id)
      ) {
        return true;
      }
    }
  }

  // 3. Everyone override (third priority)
  if (hiddenFromRoles.includes('everyone')) {
    return false;
  }
  if (
    allowedRoles.includes('everyone') ||
    readRoles.includes('everyone') ||
    writeRoles.includes('everyone')
  ) {
    return true;
  }

  // 4. Fallback/Default (private channel checks)
  if (hiddenFromRoles.includes('everyone')) {
    return false;
  }

  return true;
};

export const canUserWriteToChannel = (
  group: Group | undefined,
  channel: GroupChannel | undefined,
  userId: string | undefined,
): boolean => {
  if (!group || !channel || !userId) {
    return false;
  }

  const member = group.members.find((m) => m.userId === userId);
  if (!member) {
    return false;
  }

  // Group owner, admin, or manage_group/manage_channels bypasses write restrictions
  if (
    member.role === 'owner' ||
    member.role === 'admin' ||
    member.user?.role === 'admin' ||
    hasGroupPermission(group, userId, 'manage_group') ||
    hasGroupPermission(group, userId, 'manage_channels')
  ) {
    return true;
  }

  // Must have read/view access first
  if (!canUserAccessChannel(group, channel, userId)) {
    return false;
  }

  const hiddenFromUsers = channel.hiddenFromUserIds || [];
  const writeUsers = channel.writeUserIds || [];
  const denyWriteUsers = channel.denyWriteUserIds || [];

  // 1. User-level overrides (highest priority)
  if (hiddenFromUsers.includes(userId) || denyWriteUsers.includes(userId)) {
    return false;
  }
  if (writeUsers.includes(userId)) {
    return true;
  }

  // 2. Role-level evaluation (second priority)
  const memberRoleIds = member.roleIds || [];
  const writeRoles = channel.writeRoleIds || [];
  const denyWriteRoles = channel.denyWriteRoleIds || [];

  if (memberRoleIds.length > 0 && group.roles) {
    const userRoles = group.roles.filter((role) =>
      memberRoleIds.includes(role.id),
    );
    const sortedRoles = [...userRoles].sort((a, b) => {
      const hpA = a.hierarchyPriority ?? a.priority ?? 1000000;
      const hpB = b.hierarchyPriority ?? b.priority ?? 1000000;
      return hpA - hpB;
    });

    const configuredRole = sortedRoles.find(
      (role) =>
        denyWriteRoles.includes(role.id) || writeRoles.includes(role.id),
    );

    if (configuredRole) {
      if (denyWriteRoles.includes(configuredRole.id)) {
        return false;
      }
      if (writeRoles.includes(configuredRole.id)) {
        return true;
      }
    }
  }

  // 3. Everyone override (third priority)
  if (denyWriteRoles.includes('everyone')) {
    return false;
  }
  if (writeRoles.includes('everyone')) {
    return true;
  }

  // 4. Fallback/Default
  if (channel.isReadOnly) {
    return false;
  }

  return true;
};
