let isEmojiIndexInit = false;

export const searchEmojis = async (query: string) => {
  if (!query) {
    return [];
  }
  try {
    const [data, { init, SearchIndex }] = await Promise.all([
      import('@emoji-mart/data').then((m) => m.default),
      import('emoji-mart'),
    ]);
    if (!isEmojiIndexInit) {
      init({ data });
      isEmojiIndexInit = true;
    }
    const results = await SearchIndex.search(query);
    return results?.slice(0, 10) || [];
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const isOnlyEmojis = (str: string): boolean => {
  const cleanStr = str.replace(/\s/g, ''); // Remove all whitespace
  if (!cleanStr) {
    return false;
  }

  // Regex matching emojis and pictographs
  const emojiRegex =
    /^(\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\p{Extended_Pictographic})+$/u;
  if (!emojiRegex.test(cleanStr)) {
    return false;
  }

  // Exclude standard alphanumeric characters
  const hasTextOrDigits = /[a-zA-Z0-9]/g.test(cleanStr);
  if (hasTextOrDigits) {
    return false;
  }

  return true;
};

export const getContrastColor = (color: string): string => {
  if (!color || color === 'inherit') {
    return '#ffffff';
  }
  let hex = color;
  if (color.startsWith('var(')) {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const varName = color.match(/var\(([^)]+)\)/)?.[1];
      if (varName) {
        hex = getComputedStyle(document.documentElement)
          .getPropertyValue(varName)
          .trim();
      }
    }
  }
  if (!hex || hex.startsWith('var(')) {
    return '#ffffff';
  }
  const cleanHex = hex.replace('#', '');
  let r = 0;
  let g = 0;
  let b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
  } else {
    return '#ffffff';
  }
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  return brightness > 128 ? '#000000' : '#ffffff';
};

export const calculatePopoverPosition = (
  rect: DOMRect,
  popoverWidth = 260,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024,
): { top: number; right?: number; left?: number } => {
  const isRightSide = rect.left > viewportWidth / 2;

  if (isRightSide) {
    const fitsOnLeft = rect.left - 8 - popoverWidth >= 16;
    if (fitsOnLeft) {
      return {
        top: rect.top + rect.height / 2,
        right: viewportWidth - rect.left + 8,
      };
    }
    return {
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    };
  }

  const fitsOnRight = rect.right + 8 + popoverWidth <= viewportWidth - 16;
  if (fitsOnRight) {
    return {
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    };
  }
  return {
    top: rect.top + rect.height / 2,
    right: viewportWidth - rect.left + 8,
  };
};

export const getMemberDetailsHelper = (
  userId: string,
  user: any,
  userProfiles: Record<string, any>,
  activeGroup: any,
  onlineUsers: Record<string, any>,
  friends: any[],
) => {
  const member = activeGroup?.members?.find((m: any) => m.userId === userId);
  const userObj =
    userId === user?.id
      ? user
      : userProfiles[userId] ||
        member?.user ||
        friends.find((f: any) => f.id === userId) ||
        null;

  const displayName =
    userObj?.displayName ||
    userObj?.username ||
    userObj?.email?.split('@')[0] ||
    'User';
  const email = userObj?.email || '';
  const username = userObj?.username || '';
  const presence =
    userId === user?.id
      ? user?.status || 'online'
      : onlineUsers[userId] || 'offline';
  const isOwnerMember = activeGroup?.ownerId === userId;
  const memberRoleIds = member?.roleIds || [];
  const groupRoles = activeGroup?.roles || [];
  const matchingRoles = [...groupRoles]
    .filter((r: any) => memberRoleIds.includes(r.id))
    .sort((a: any, b: any) => {
      const hpA = a.hierarchyPriority ?? a.priority ?? 1000000;
      const hpB = b.hierarchyPriority ?? b.priority ?? 1000000;
      if (hpA !== hpB) {
        return hpA - hpB;
      }
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

  const colorRoles = [...matchingRoles].sort((a: any, b: any) => {
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
    return 0;
  });

  const color = isOwnerMember ? '#eab308' : colorRoles[0]?.color || 'inherit';

  return {
    id: userId,
    displayName,
    email,
    username,
    avatarUrl: userObj?.avatarUrl,
    avatarThumbnailUrl: userObj?.avatarThumbnailUrl,
    presence,
    isOwner: isOwnerMember,
    role: member?.role || 'member',
    roleIds: memberRoleIds,
    matchingRoles,
    color,
  };
};
