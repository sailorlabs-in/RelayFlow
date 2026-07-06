import type { Group } from '../store/slices/groupsSlice';

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
