import type { PresenceStatus } from '@chat-app/shared-constants';
import { PRESENCE_DOT_COLORS, STATUS_TEXTS } from '@chat-app/shared-constants';
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(
  async () => {
    const [Picker, data] = await Promise.all([
      import('@emoji-mart/react'),
      import('@emoji-mart/data'),
    ]);
    return function EmojiPickerWrapper(props: any) {
      return <Picker.default data={data.default} {...props} />;
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-center text-[13px] text-theme-muted w-88 h-108.75 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-(--accent-primary)" />
      </div>
    ),
  },
);

let isEmojiIndexInit = false;
const searchEmojis = async (query: string) => {
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

import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchMessages,
  deleteConversation,
  fetchUserProfile,
  setActiveConversation,
  startOutgoingCall,
} from '../store/slices/chatSlice';
import { socketManager } from '../store/socketManager';
import { generateImageThumbnail, generateVideoThumbnail } from '../utils/media';
import {
  hasGroupPermission,
  canUserWriteToChannel,
} from '../utils/permissions';
import { formatMessageTimestamp, formatReadAtTimestamp } from '../utils/date';

import { Avatar } from './Avatar';
import { MemberProfilePopover } from './MemberProfilePopover';
import { ConfirmationModal } from './ConfirmationModal';
import { FriendsDashboard } from './FriendsDashboard';
import {
  IconSend,
  IconTrash,
  IconChat,
  IconCheck,
  IconDoubleCheck,
  IconX,
  IconEmoji,
  IconCompose,
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconLink,
  IconList,
  IconQuote,
  IconEye,
} from './Icons';
import { PresenceDot } from './PresenceDot';
import { showToast } from './toast';
import type { Message, MessageMediaItem } from '../store/slices/chatSlice';

interface ChatAreaProps {
  activeConversationId: string | null;
  setIsComposeOpen: (open: boolean) => void;
  isChannelMode?: boolean;
  activeChannelName?: string | null;
  isMembersListOpen?: boolean;
  onToggleMembersList?: () => void;
  onMenuClick?: () => void;
  isMobileView?: boolean;
}

const isOnlyEmojis = (str: string): boolean => {
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

const getContrastColor = (color: string): string => {
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
  let r = 0,
    g = 0,
    b = 0;
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

const renderMessageMedia = (
  msg: Message,
  onMediaClick: (item: MessageMediaItem) => void,
) => {
  const mediaItems: MessageMediaItem[] = msg.media || [];

  if (mediaItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-col gap-2 max-w-full">
      {mediaItems.map((item, idx) => {
        const isImage = item.type?.startsWith('image/');
        const isVideo = item.type?.startsWith('video/');

        if (isImage) {
          const displayUrl = item.thumbnailUrl || item.url;
          return (
            <div
              key={idx}
              className="mt-1 max-w-full w-fit rounded-lg overflow-hidden border border-theme bg-theme-input hover:scale-[1.01] transition-all duration-200 h-[240px]  max-w-[360px]"
            >
              <img
                src={displayUrl}
                alt={item.name || 'Image'}
                className="h-full w-auto max-w-full max-w-[360px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onMediaClick(item)}
              />
            </div>
          );
        }

        if (isVideo) {
          const displayUrl = item.thumbnailUrl || item.url;
          return (
            <div
              key={idx}
              className="mt-1 max-w-full w-fit rounded-lg overflow-hidden border border-theme bg-theme-input relative cursor-pointer hover:scale-[1.01] transition-all duration-200 group h-[240px]  max-w-[360px]"
              onClick={() => onMediaClick(item)}
            >
              {item.thumbnailUrl ? (
                <div className="relative h-full w-fit">
                  <img
                    src={displayUrl}
                    alt={item.name || 'Video'}
                    className="h-full w-auto max-w-full max-w-[360px] object-cover transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/25 transition-colors duration-150">
                    <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center text-black shadow-lg hover:scale-105 active:scale-95 transition-all duration-150">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 ml-0.5 text-(--accent-primary)"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <video
                  src={item.url}
                  className="h-full w-auto max-w-full max-w-[360px] object-cover"
                  preload="metadata"
                />
              )}
            </div>
          );
        }

        return (
          <div
            key={idx}
            className="mt-1 flex items-center gap-3 p-3 rounded-lg border border-theme bg-theme-input max-w-sm text-[13px] text-left"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-(--accent-primary) text-white text-[16px] shrink-0">
              📁
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="font-semibold truncate text-theme-primary text-[13.5px]">
                {item.name || 'Attachment'}
              </div>
              <div className="text-[11px] text-theme-muted mt-0.5">
                {item.size
                  ? `${(item.size / 1024).toFixed(1)} KB`
                  : 'Unknown size'}
              </div>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-(--theme-btn) text-theme-secondary hover:text-theme-primary hover:bg-(--theme-btn-hover) shrink-0 flex items-center justify-center active-press"
              title="Download file"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="w-4 h-4"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          </div>
        );
      })}
    </div>
  );
};

export const ChatArea = ({
  activeConversationId,
  setIsComposeOpen,
  isChannelMode = false,
  activeChannelName = null,
  isMembersListOpen = false,
  onToggleMembersList,
  onMenuClick,
  isMobileView = false,
}: ChatAreaProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const feedEndRef = useRef<HTMLDivElement>(null);

  const { user } = useAppSelector((s) => s.auth);

  const [timeStr, setTimeStr] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );

      const hr = now.getHours();
      if (hr < 12) {
        setGreeting('Good morning');
      } else if (hr < 17) {
        setGreeting('Good afternoon');
      } else {
        setGreeting('Good evening');
      }
    };
    updateTimeAndGreeting();
    const interval = setInterval(updateTimeAndGreeting, 1000);
    return () => clearInterval(interval);
  }, []);
  const {
    conversations,
    messages,
    typingUsers,
    onlineUsers,
    userProfiles,
    convoRecipients,
    hasMoreMessages,
    friends,
  } = useAppSelector((s) => s.chat);

  const { groups, activeGroupId } = useAppSelector((s) => s.groups);

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const activeChannel = activeGroup?.channels?.find(
    (c) => c.id === activeConversationId,
  );
  const isBubbleLayout = !isChannelMode || activeChannel?.layout === 'bubble';
  const isVoiceChannel = isChannelMode && activeChannel?.layout === 'voice';

  const isGroupChannel = !!(activeGroup && activeChannel);
  const isOwner = activeGroup?.ownerId === user?.id;
  const isAdmin =
    activeGroup?.members?.find((m) => m.userId === user?.id)?.role === 'admin';

  const hasChannelWriteAccess =
    !isGroupChannel ||
    !activeChannel ||
    !user?.id ||
    canUserWriteToChannel(activeGroup, activeChannel, user.id);

  const canSendMessages =
    (!isGroupChannel ||
      hasGroupPermission(activeGroup, user?.id, 'send_messages')) &&
    hasChannelWriteAccess;
  const canAttachFiles =
    (!isGroupChannel ||
      hasGroupPermission(activeGroup, user?.id, 'attach_files')) &&
    hasChannelWriteAccess;
  const canDeleteOthers =
    isChannelMode &&
    !!activeGroup &&
    (isOwner ||
      isAdmin ||
      hasGroupPermission(activeGroup, user?.id, 'delete_other_messages'));

  // --- Local state ---
  const [messageInput, setMessageInput] = useState('');
  const [isMdMode, setIsMdMode] = useState(false);
  const [mdTab, setMdTab] = useState<'write' | 'preview'>('write');
  const [isTypingState, setIsTypingState] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiPickerContainerRef = useRef<HTMLDivElement>(null);

  const [emojiPickerStyle, setEmojiPickerStyle] = useState<React.CSSProperties>(
    {
      opacity: 0,
      pointerEvents: 'none',
    },
  );

  const [mentionQuery, setMentionQuery] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const [emojiResults, setEmojiResults] = useState<any[]>([]);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(
    null,
  );
  const [atMentionQuery, setAtMentionQuery] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const [activeSuggestIndex, setActiveSuggestIndex] = useState<number>(0);

  const matchingMentions = React.useMemo(() => {
    if (!atMentionQuery || !isChannelMode || !activeGroup) {
      return [];
    }
    const q = atMentionQuery.text.toLowerCase();
    const list: {
      id: string;
      name: string;
      isEveryone?: boolean;
      member?: any;
    }[] = [];

    if ('everyone'.startsWith(q) || q === '') {
      list.push({ id: 'everyone', name: 'everyone', isEveryone: true });
    }

    const matchingMembers = (activeGroup.members || [])
      .filter((m) => !m.isGhost)
      .filter((m) => {
        const username = m.user?.username?.toLowerCase() || '';
        const displayName = m.user?.displayName?.toLowerCase() || '';
        return username.includes(q) || displayName.includes(q);
      });

    matchingMembers.forEach((m) => {
      const name = m.user?.username || m.user?.displayName || 'Member';
      list.push({ id: m.id, name, member: m });
    });

    return list;
  }, [atMentionQuery, isChannelMode, activeGroup]);

  useEffect(() => {
    setActiveSuggestIndex(0);
  }, [atMentionQuery?.text]);

  // Focus the input field and scroll feed to bottom when replying to a message
  useEffect(() => {
    if (replyingToMessage) {
      document.getElementById('message-input')?.focus();
      setTimeout(() => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [replyingToMessage]);

  const [activeReactionMessageId, setActiveReactionMessageId] = useState<
    string | null
  >(null);
  const [profileCardUserId, setProfileCardUserId] = useState<string | null>(
    null,
  );
  const [profilePopoverPosition, setProfilePopoverPosition] = useState<{
    top: number;
    right?: number;
    left?: number;
  } | null>(null);

  const findUserByName = (name: string) => {
    const clean = name.toLowerCase().replace(/^@/, '');
    if (!clean) {
      return null;
    }

    if (
      user?.username?.toLowerCase() === clean ||
      user?.displayName?.toLowerCase() === clean
    ) {
      return user;
    }

    if (activeGroup?.members) {
      const member = activeGroup.members.find(
        (m) =>
          m.user?.username?.toLowerCase() === clean ||
          m.user?.displayName?.toLowerCase() === clean,
      );
      if (member?.user) {
        return member.user;
      }
    }

    const cachedProfile = Object.values(userProfiles).find(
      (p) =>
        p?.username?.toLowerCase() === clean ||
        p?.displayName?.toLowerCase() === clean,
    );
    if (cachedProfile) {
      return cachedProfile;
    }

    const friend = friends.find(
      (f) =>
        f?.username?.toLowerCase() === clean ||
        f?.displayName?.toLowerCase() === clean,
    );
    if (friend) {
      return friend;
    }

    return null;
  };

  const getMemberDetailsForPopover = (userId: string) => {
    const member = activeGroup?.members?.find((m) => m.userId === userId);
    const userObj =
      userId === user?.id
        ? user
        : userProfiles[userId] ||
          member?.user ||
          friends.find((f) => f.id === userId) ||
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
        ? (user?.status as any) || 'online'
        : (onlineUsers[userId] as any) || 'offline';
    const isOwner = activeGroup?.ownerId === userId;
    const memberRoleIds = member?.roleIds || [];
    const groupRoles = activeGroup?.roles || [];
    const matchingRoles = [...groupRoles]
      .filter((r) => memberRoleIds.includes(r.id))
      .sort((a, b) => {
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

    const colorRoles = [...matchingRoles].sort((a, b) => {
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

    const color = isOwner ? '#eab308' : colorRoles[0]?.color || 'inherit';

    return {
      id: userId,
      displayName,
      email,
      username,
      avatarUrl: userObj?.avatarUrl,
      avatarThumbnailUrl: userObj?.avatarThumbnailUrl,
      presence,
      isOwner,
      role: member?.role || 'member',
      roleIds: memberRoleIds,
      matchingRoles,
      color,
    };
  };

  const handleOpenProfile = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 260; // w-65 is 260px
    const viewportWidth = window.innerWidth;

    const isRightSide = rect.left > viewportWidth / 2;

    let position: { top: number; right?: number; left?: number };

    if (isRightSide) {
      const fitsOnLeft = rect.left - 8 - popoverWidth >= 16;
      if (fitsOnLeft) {
        position = {
          top: rect.top + rect.height / 2,
          right: viewportWidth - rect.left + 8,
        };
      } else {
        position = {
          top: rect.top + rect.height / 2,
          left: rect.right + 8,
        };
      }
    } else {
      const fitsOnRight = rect.right + 8 + popoverWidth <= viewportWidth - 16;
      if (fitsOnRight) {
        position = {
          top: rect.top + rect.height / 2,
          left: rect.right + 8,
        };
      } else {
        position = {
          top: rect.top + rect.height / 2,
          right: viewportWidth - rect.left + 8,
        };
      }
    }

    setProfilePopoverPosition(position);
    setProfileCardUserId(userId);
    if (userId !== user?.id && !userProfiles[userId]) {
      dispatch(fetchUserProfile(userId));
    }
  };

  const getReactingUserNames = (userIds: string[]) => {
    return userIds.map((uid) => {
      if (uid === user?.id) {
        return 'You';
      }
      const profile = userProfiles[uid];
      if (profile?.username) {
        return `@${profile.username}`;
      }
      if (profile?.displayName) {
        return profile.displayName;
      }
      const groupMem = activeGroup?.members?.find(
        (m) => m.userId === uid,
      )?.user;
      if (groupMem?.username) {
        return `@${groupMem.username}`;
      }
      if (groupMem?.displayName) {
        return groupMem.displayName;
      }
      const friend = friends.find((f) => f.id === uid);
      if (friend?.username) {
        return `@${friend.username}`;
      }
      if (friend?.displayName) {
        return friend.displayName;
      }
      return 'Someone';
    });
  };

  const renderMessageContent = (content: string, isMarkdownMsg?: boolean) => {
    if (!content) {
      return null;
    }
    if (isMarkdownMsg || isMdMode) {
      return (
        <div className="markdown-body prose prose-sm dark:prose-invert max-w-none break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      );
    }
    if (!isChannelMode) {
      return content;
    }
    const parts = content.split(/(@everyone|@[a-zA-Z0-9_.-]+)/g);
    const currentUserTag = user?.username ? `@${user.username}` : '';

    return parts.map((part, idx) => {
      if (part === '@everyone') {
        const textColor = getContrastColor('var(--accent-primary)');
        const borderColor =
          textColor === '#ffffff'
            ? 'rgba(255, 255, 255, 0.35)'
            : 'rgba(0, 0, 0, 0.18)';
        return (
          <span
            key={idx}
            className="font-semibold px-1.5 py-0.5 rounded text-[13px] shadow-sm"
            style={{
              display: 'inline-block',
              margin: '0 2px',
              backgroundColor: 'var(--accent-primary)',
              color: textColor,
              border: `1.5px solid ${borderColor}`,
            }}
          >
            @everyone
          </span>
        );
      } else if (part.startsWith('@')) {
        const cleanName = part.slice(1);
        const resolvedUser = findUserByName(cleanName);

        let roleColor = 'var(--accent-primary)';
        if (resolvedUser?.id) {
          const member = activeGroup?.members?.find(
            (m) => m.userId === resolvedUser.id,
          );
          const memberRoleIds = member?.roleIds || [];
          const groupRoles = activeGroup?.roles || [];
          const matchingRoles = [...groupRoles]
            .filter((r) => memberRoleIds.includes(r.id))
            .sort((a, b) => {
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
          const isOwner =
            member?.role === 'owner' ||
            activeGroup?.ownerId === resolvedUser.id;
          // Owner color always wins — check it first, before any role color
          const color = isOwner ? '#eab308' : matchingRoles[0]?.color || null;
          if (color && color !== 'inherit') {
            roleColor = color;
          }
        }

        const isMe =
          currentUserTag && part.toLowerCase() === currentUserTag.toLowerCase();

        if (isMe) {
          const textColor = getContrastColor(roleColor);
          const borderColor =
            textColor === '#ffffff'
              ? 'rgba(255, 255, 255, 0.35)'
              : 'rgba(0, 0, 0, 0.18)';
          return (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (resolvedUser?.id) {
                  handleOpenProfile(e, resolvedUser.id);
                }
              }}
              className="font-semibold px-1.5 py-0.5 rounded text-[13px] shadow-sm cursor-pointer hover:opacity-90 active:scale-95 transition-all"
              style={{
                display: 'inline-block',
                margin: '0 2px',
                backgroundColor: roleColor,
                color: textColor,
                border: `1.5px solid ${borderColor}`,
              }}
            >
              {part}
            </span>
          );
        } else {
          return (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (resolvedUser?.id) {
                  handleOpenProfile(e, resolvedUser.id);
                }
              }}
              className="font-semibold cursor-pointer hover:underline transition-all"
              style={{
                display: 'inline-block',
                margin: '0 1px',
                color: roleColor,
              }}
            >
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        (!emojiPickerContainerRef.current ||
          !emojiPickerContainerRef.current.contains(event.target as Node))
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Global keydown listener to cancel editing on Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingMessageId) {
        setEditingMessageId(null);
        setEditingContent('');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [editingMessageId]);

  const onEmojiSelect = (emoji: any) => {
    setMessageInput((prev) => prev + emoji.native);
  };

  const [activeMediaItem, setActiveMediaItem] =
    useState<MessageMediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<
    {
      url: string;
      name: string;
      type: string;
      size: number;
      thumbnailUrl?: string;
      thumbnailName?: string;
    }[]
  >([]);
  const [uploading, setUploading] = useState(false);

  const deleteUploadedFile = async (url: string) => {
    if (!url) {
      return;
    }
    try {
      const bucketUrl = (
        process.env.NEXT_PUBLIC_BUCKET_URL || 'https://bucket.umangsailor.com'
      ).replace(/\/+$/, '');
      const prefix = `${bucketUrl}/storage/`;
      if (url.startsWith(prefix)) {
        const path = url.slice(prefix.length);
        const parts = path.split('/');
        if (parts.length >= 2) {
          const bucket = parts[0];
          const name = parts.slice(1).join('/');
          await fetch(`${bucketUrl}/files`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bucket,
              names: [name],
            }),
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete uploaded file:', err);
    }
  };

  const processFiles = async (files: File[]) => {
    const availableSlots = 10 - attachedFiles.length;
    if (availableSlots <= 0) {
      showToast.error('You can only attach up to 10 files.');
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      showToast.error(`Only ${availableSlots} more file(s) can be attached.`);
    }

    const validFiles = filesToUpload.filter((f) => {
      if (f.size > 20 * 1024 * 1024) {
        showToast.error(`File ${f.name} exceeds 20MB limit.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    setUploading(true);

    try {
      const bucketUrl = (
        process.env.NEXT_PUBLIC_BUCKET_URL || 'https://bucket.umangsailor.com'
      ).replace(/\/+$/, '');

      const uploadPromises = validFiles.map(async (file) => {
        // 1. Upload main media file
        const formData = new FormData();
        formData.append('bucket', 'relayflow');
        formData.append('folder', 'chat-medis');
        formData.append('files', file);

        const response = await fetch(`${bucketUrl}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        if (!data.files || data.files.length === 0) {
          throw new Error('No files returned');
        }
        const uploaded = data.files[0];

        // 2. Generate and upload thumbnail if it's image or video (excluding GIFs)
        let thumbnailUrl: string | undefined;
        let thumbnailName: string | undefined;
        const isGif =
          file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
        const isImage = file.type.startsWith('image/') && !isGif;
        const isVideo = file.type.startsWith('video/');

        try {
          let thumbBlob: Blob | null = null;
          if (isImage) {
            thumbBlob = await generateImageThumbnail(file);
          } else if (isVideo) {
            thumbBlob = await generateVideoThumbnail(file);
          }

          if (thumbBlob) {
            const generatedThumbName = `thumb_${file.name.replace(/\.[^/.]+$/, '')}.jpg`;
            const thumbFile = new File([thumbBlob], generatedThumbName, {
              type: 'image/jpeg',
            });
            const thumbFormData = new FormData();
            thumbFormData.append('bucket', 'relayflow');
            thumbFormData.append('folder', 'chat-medis');
            thumbFormData.append('files', thumbFile);

            const thumbResponse = await fetch(`${bucketUrl}/upload`, {
              method: 'POST',
              body: thumbFormData,
            });

            if (thumbResponse.ok) {
              const thumbData = await thumbResponse.json();
              if (thumbData.files && thumbData.files.length > 0) {
                thumbnailUrl = thumbData.files[0].url;
                thumbnailName =
                  thumbData.files[0].originalName || generatedThumbName;
              }
            }
          }
        } catch (thumbErr) {
          console.warn('Failed to generate or upload thumbnail:', thumbErr);
        }

        return {
          url: uploaded.url,
          name: uploaded.originalName || file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          thumbnailUrl,
          thumbnailName,
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachedFiles((prev) => [...prev, ...uploadedFiles]);
    } catch (err) {
      console.error('File upload error:', err);
      showToast.error('Failed to upload some files.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }
    await processFiles(files);
  };
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'info';
    onConfirm: () => void;
  } | null>(null);

  interface MessageContextMenuState {
    message: Message;
    x: number;
    y: number;
  }
  const [contextMenu, setContextMenu] =
    useState<MessageContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [adjustedContextMenu, setAdjustedContextMenu] = useState<{
    x: number;
    y: number;
    subMenuLeft: boolean;
    subMenuUp: boolean;
  } | null>(null);

  // --- Pagination & Scroll UX state ---
  const isFetchingMoreRef = useRef(false);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const scrollHeightBeforeLoadRef = useRef(0);
  const scrollTopBeforeLoadRef = useRef(0);
  const prevActiveConvoIdRef = useRef<string | null>(null);
  const prevMessagesLengthRef = useRef(0);
  const isFirstRenderForConvoRef = useRef(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---- Messages on conversation change ----
  useEffect(() => {
    setMessageInput('');
    setIsMdMode(false);
    setMdTab('write');
    setIsTypingState(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (activeConversationId && activeConversationId !== 'friends') {
      dispatch(
        fetchMessages({
          conversationId: activeConversationId,
          limit: 20,
          offset: 0,
        }),
      );
      socketManager.joinConversation(activeConversationId);

      return () => {
        socketManager.leaveConversation(activeConversationId);
      };
    }
    return undefined;
  }, [activeConversationId, dispatch]);

  useEffect(() => {
    if (activeConversationId && activeConversationId !== 'friends') {
      const recipientId = convoRecipients[activeConversationId];
      if (
        recipientId &&
        user &&
        recipientId !== user.id &&
        !userProfiles[recipientId]
      ) {
        dispatch(fetchUserProfile(recipientId));
      }
    }
  }, [activeConversationId, convoRecipients, userProfiles, user, dispatch]);

  // Fetch profiles for typing users if they are not cached
  useEffect(() => {
    if (
      !activeConversationId ||
      activeConversationId === 'friends' ||
      !typingUsers[activeConversationId] ||
      !user
    ) {
      return;
    }
    Object.entries(typingUsers[activeConversationId]).forEach(
      ([uid, isTyping]) => {
        if (uid !== user.id && isTyping && !userProfiles[uid]) {
          dispatch(fetchUserProfile(uid));
        }
      },
    );
  }, [activeConversationId, typingUsers, userProfiles, user, dispatch]);

  // ---- Scroll & Anchor Management ----
  const activeMessages =
    activeConversationId && activeConversationId !== 'friends'
      ? messages[activeConversationId] || []
      : [];

  useEffect(() => {
    isFirstRenderForConvoRef.current = true;
  }, [activeConversationId]);

  useLayoutEffect(() => {
    const container = feedContainerRef.current;
    if (
      !container ||
      !activeConversationId ||
      activeConversationId === 'friends'
    ) {
      return;
    }

    const messagesLength = activeMessages.length;

    // Case 1: Active conversation changed
    if (activeConversationId !== prevActiveConvoIdRef.current) {
      prevActiveConvoIdRef.current = activeConversationId;
      prevMessagesLengthRef.current = messagesLength;
      container.scrollTop = container.scrollHeight;
      return;
    }

    // Case 2: Messages length increased
    if (messagesLength > prevMessagesLengthRef.current) {
      prevMessagesLengthRef.current = messagesLength;

      if (isFetchingMoreRef.current) {
        // We loaded older messages (pagination)
        const newScrollHeight = container.scrollHeight;
        const oldScrollHeight = scrollHeightBeforeLoadRef.current;
        const oldScrollTop = scrollTopBeforeLoadRef.current;

        container.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
        isFetchingMoreRef.current = false;
        setIsFetchingMore(false);
      } else if (isFirstRenderForConvoRef.current) {
        // Initial load of messages
        container.scrollTop = container.scrollHeight;
        isFirstRenderForConvoRef.current = false;
      } else {
        // New real-time message
        const isNearBottom =
          container.scrollHeight -
            container.clientHeight -
            container.scrollTop <
          150;
        const lastMsg = activeMessages[messagesLength - 1];
        const sentByMe = lastMsg?.senderId === user?.id;

        if (isNearBottom || sentByMe) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth',
          });
        }
      }
    } else if (messagesLength < prevMessagesLengthRef.current) {
      // Messages deleted/purged
      prevMessagesLengthRef.current = messagesLength;
    }
  }, [activeMessages, activeConversationId, user?.id]);

  // ---- Infinite scroll (load more older messages on scroll up) ----
  const hasMore = activeConversationId
    ? hasMoreMessages[activeConversationId] !== false
    : false;

  const loadMoreMessages = useCallback(async () => {
    if (isFetchingMore || !hasMore || !activeConversationId) {
      return;
    }

    const container = feedContainerRef.current;
    if (!container) {
      return;
    }

    // Record scroll positions before dispatching/loading
    scrollHeightBeforeLoadRef.current = container.scrollHeight;
    scrollTopBeforeLoadRef.current = container.scrollTop;

    isFetchingMoreRef.current = true;
    setIsFetchingMore(true);

    const currentMessages = messages[activeConversationId] || [];
    const offset = currentMessages.length;

    try {
      await dispatch(
        fetchMessages({
          conversationId: activeConversationId,
          limit: 20,
          offset,
        }),
      ).unwrap();
    } catch (err) {
      console.error('Failed to load older messages:', err);
      isFetchingMoreRef.current = false;
      setIsFetchingMore(false);
    }
  }, [activeConversationId, isFetchingMore, hasMore, messages, dispatch]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget;
      if (container.scrollTop < 20 && !isFetchingMore && hasMore) {
        loadMoreMessages();
      }
    },
    [isFetchingMore, hasMore, loadMoreMessages],
  );

  // ---- Resolve sender profiles and reaction user profiles ----
  useEffect(() => {
    if (
      activeConversationId &&
      activeConversationId !== 'friends' &&
      messages[activeConversationId]
    ) {
      messages[activeConversationId].forEach((msg) => {
        if (user && msg.senderId !== user.id && !userProfiles[msg.senderId]) {
          dispatch(fetchUserProfile(msg.senderId));
        }
        if (msg.reactions) {
          msg.reactions.forEach((react) => {
            react.userIds.forEach((uid) => {
              if (user && uid !== user.id && !userProfiles[uid]) {
                dispatch(fetchUserProfile(uid));
              }
            });
          });
        }
      });
    }
  }, [activeConversationId, messages, userProfiles, user, dispatch]);

  // ---- Messages ----
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendMessages) {
      return;
    }
    if (
      (!messageInput.trim() && attachedFiles.length === 0) ||
      !activeConversationId
    ) {
      return;
    }

    if (attachedFiles.length > 0) {
      const media = attachedFiles.map((file) => ({
        name: file.name,
        thumbnailName: file.thumbnailName,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
        type: file.type,
        size: file.size,
      }));
      socketManager.sendMessage(
        activeConversationId,
        messageInput.trim(),
        media,
        replyingToMessage?.id || undefined,
        isMdMode,
      );
    } else {
      socketManager.sendMessage(
        activeConversationId,
        messageInput.trim(),
        undefined,
        replyingToMessage?.id || undefined,
        isMdMode,
      );
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketManager.stopTyping(activeConversationId);
    setIsTypingState(false);
    setMessageInput('');
    setAttachedFiles([]);
    setShowEmojiPicker(false);
    setReplyingToMessage(null);
  };

  const checkAutocomplete = useCallback(
    async (val: string, cursor: number) => {
      const textBeforeCursor = val.slice(0, cursor);
      const match = textBeforeCursor.match(/:([a-zA-Z0-9_-]{2,})$/);
      const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_.-]*)$/);

      if (match) {
        const query = match[1];
        setMentionQuery({
          text: query,
          start: match.index as number,
          end: cursor,
        });
        const results = await searchEmojis(query);
        setEmojiResults(results);
      } else {
        setMentionQuery(null);
        setEmojiResults([]);
      }

      if (atMatch && isChannelMode) {
        const query = atMatch[1];
        setAtMentionQuery({
          text: query,
          start: atMatch.index as number,
          end: cursor,
        });
      } else {
        setAtMentionQuery(null);
      }
    },
    [isChannelMode],
  );

  const applyFormat = (prefix: string, suffix = '') => {
    if (!textareaRef.current) {
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = messageInput;
    const selectedText = text.substring(start, end);

    if (!suffix) {
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + prefix + selectedText + after;
      setMessageInput(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            start + prefix.length,
            end + prefix.length,
          );
        }
      }, 0);
      return;
    }

    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + prefix + selectedText + suffix + after;
    setMessageInput(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + prefix.length,
          end + prefix.length,
        );
      }
    }, 0);
  };

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    let val = e.target.value;
    if (val === '/md ') {
      setIsMdMode(true);
      val = '';
    }
    setMessageInput(val);

    const cursor = e.target.selectionStart;
    await checkAutocomplete(val, cursor);

    if (!activeConversationId) {
      return;
    }
    if (!isTypingState) {
      setIsTypingState(true);
      socketManager.startTyping(activeConversationId);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socketManager.stopTyping(activeConversationId);
      setIsTypingState(false);
    }, 1500);
  };

  const handleTextareaSelect = (
    e: React.SyntheticEvent<HTMLTextAreaElement>,
  ) => {
    const target = e.currentTarget;
    checkAutocomplete(target.value, target.selectionStart);
  };

  // ---- Delete conversation ----
  const handleDeleteConversation = (convoId: string | null) => {
    if (!convoId) {
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Thread',
      message:
        'Are you sure you want to remove this thread and all its messages? This action cannot be undone.',
      confirmLabel: 'Delete',
      type: 'danger',
      onConfirm: () => {
        dispatch(deleteConversation(convoId));
        setConfirmModal(null);
      },
    });
  };

  const handleStartCall = () => {
    if (!activeConversationId || !activeDetails?.id) {
      return;
    }
    dispatch(
      startOutgoingCall({
        conversationId: activeConversationId,
        targetUserId: activeDetails.id,
        callerName:
          user?.displayName ||
          user?.username ||
          user?.email?.split('@')[0] ||
          'User',
      }),
    );
    socketManager.startDmCall(activeDetails.id, activeConversationId);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!activeConversationId) {
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Message',
      message:
        'Are you sure you want to delete this message? This action is permanent and cannot be undone.',
      confirmLabel: 'Delete',
      type: 'danger',
      onConfirm: () => {
        socketManager.deleteMessage(messageId, activeConversationId);
        setConfirmModal(null);
      },
    });
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const handleSaveEdit = (messageId: string) => {
    if (!editingContent.trim() || !activeConversationId) {
      return;
    }
    socketManager.editMessage(
      messageId,
      activeConversationId,
      editingContent.trim(),
    );
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setContextMenu({ message: msg, x: e.clientX, y: e.clientY });
  };

  const handleMobileClick = (e: React.MouseEvent, msg: Message) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'A' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ message: msg, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

  useLayoutEffect(() => {
    if (contextMenu && contextMenuRef.current) {
      const menu = contextMenuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustX = contextMenu.x;
      let adjustY = contextMenu.y;

      // Adjust X (left/right bounds)
      if (contextMenu.x + rect.width > viewportWidth) {
        adjustX = viewportWidth - rect.width - 16;
      }
      if (adjustX < 16) {
        adjustX = 16;
      }

      // Adjust Y (top/bottom bounds)
      if (contextMenu.y + rect.height > viewportHeight) {
        adjustY = viewportHeight - rect.height - 16;
      }
      if (adjustY < 16) {
        adjustY = 16;
      }

      // Submenu check: Submenu is 160px wide (w-40).
      // If we put the submenu on the right of the context menu, it will start at (adjustX + rect.width)
      // and end at (adjustX + rect.width + 160).
      // If that ends up exceeding the viewport, we position the submenu on the left instead!
      const subMenuLeft = adjustX + rect.width + 160 + 16 > viewportWidth;

      // Vertical submenu check: submenu max height is ~220px (header + 150px list + padding)
      // The submenu opens at the row's y offset within the context menu.
      // Approximate: if context menu bottom is less than 220px from the bottom, open submenu upward.
      const subMenuUp = adjustY + rect.height + 220 > viewportHeight;

      setAdjustedContextMenu({
        x: adjustX,
        y: adjustY,
        subMenuLeft,
        subMenuUp,
      });
    } else {
      setAdjustedContextMenu(null);
    }
  }, [contextMenu]);

  // Emoji picker: calculate position at click time using known emoji-mart dimensions.
  // Using known dimensions avoids web-component async render timing issues.
  const handleEmojiPickerToggle = () => {
    if (!showEmojiPicker && emojiPickerRef.current) {
      const rect = emojiPickerRef.current.getBoundingClientRect();
      const PW = 352;
      const PH = 440;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Prefer above the button; flip below if not enough space
      let top = -PH - 8;
      if (rect.top + top < 16) {
        top = rect.height + 8;
        if (rect.bottom + PH + 8 > vh - 16) {
          top = 16 - rect.top;
        }
      }

      // Left-align; shift left if it overflows right edge
      let left = 0;
      if (rect.left + PW > vw - 16) {
        left = vw - 16 - PW - rect.left;
      }
      if (rect.left + left < 16) {
        left = 16 - rect.left;
      }

      setEmojiPickerStyle({
        top: `${top}px`,
        left: `${left}px`,
        opacity: 1,
        pointerEvents: 'auto',
      });
    } else {
      setEmojiPickerStyle({ opacity: 0, pointerEvents: 'none' });
    }
    setShowEmojiPicker((prev) => !prev);
  };

  // ---- Conversation display name helper ----
  const getConversationDetails = (convo: any) => {
    if (!user) {
      return null;
    }
    if (convo.name) {
      return { name: convo.name, letter: convo.name[0].toUpperCase() };
    }

    let recipientId = convoRecipients[convo.id];
    if (!recipientId) {
      const roomMsgs = messages[convo.id] || [];
      const recipientMsg = roomMsgs.find((m) => m.senderId !== user.id);
      if (recipientMsg) {
        recipientId = recipientMsg.senderId;
      }
    }

    if (recipientId && userProfiles[recipientId]) {
      const r = userProfiles[recipientId];
      return {
        name: r.username ? r.username : r.displayName || r.email.split('@')[0],
        letter: (r.username || r.displayName || r.email)[0].toUpperCase(),
        email: r.email,
        id: r.id,
        avatarUrl: r.avatarUrl,
        avatarThumbnailUrl: r.avatarThumbnailUrl,
      };
    }

    return { name: 'Direct Message', letter: 'D', email: '', id: null };
  };

  if (!user) {
    return <div className="flex-1" />;
  }

  if (activeConversationId === 'friends') {
    return <FriendsDashboard onMenuClick={onMenuClick} />;
  }

  const activeConvo = conversations.find((c) => c.id === activeConversationId);
  const activeDetails = activeConvo
    ? getConversationDetails(activeConvo)
    : null;
  const activeStatus: string = activeDetails?.id
    ? onlineUsers[activeDetails.id] || 'offline'
    : 'offline';
  const isActiveTyping =
    activeConversationId && typingUsers[activeConversationId]
      ? Object.entries(typingUsers[activeConversationId]).some(
          ([uid, typing]) => uid !== user.id && typing,
        )
      : false;

  // Find all other users typing in the active conversation
  const typingUsernames =
    activeConversationId && typingUsers[activeConversationId]
      ? Object.entries(typingUsers[activeConversationId])
          .filter(([uid, typing]) => uid !== user.id && typing)
          .map(([uid]) => {
            const profile = userProfiles[uid];
            return profile?.username
              ? `@${profile.username}`
              : profile?.displayName ||
                  profile?.email?.split('@')[0] ||
                  'Someone';
          })
      : [];

  const getTypingText = () => {
    if (typingUsernames.length === 0) {
      return '';
    }
    if (typingUsernames.length === 1) {
      return `${typingUsernames[0]} is typing`;
    }
    if (typingUsernames.length === 2) {
      return `${typingUsernames[0]} and ${typingUsernames[1]} are typing`;
    }
    return `${typingUsernames[0]}, ${typingUsernames[1]} and ${typingUsernames.length - 2} others are typing`;
  };

  // Derive the live message from Redux so readBy is always up-to-date in the context menu
  const liveContextMenuMsg = contextMenu
    ? (activeMessages.find((m) => m.id === contextMenu.message.id) ??
      contextMenu.message)
    : null;

  return (
    <div
      className={`glass-panel flex flex-col overflow-hidden h-full flex-1 min-w-0 ${isMobileView ? 'rounded-none' : ''}`}
    >
      {activeConversationId && (activeDetails || isChannelMode) ? (
        <>
          {/* Chat Header — hidden in mobile view since MobileDashboard renders its own header */}
          {!isMobileView && (
            <div
              className={`flex items-center justify-between gap-3 border-b border-theme bg-theme-sidebar/40 backdrop-blur-md rounded-t-2xl shrink-0 ${isMobileScreen ? 'px-3.5 py-2.5' : 'px-5 py-3.5'}`}
            >
              {isChannelMode ? (
                /* Channel mode header */
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {onMenuClick && (
                    <button
                      id="mobile-menu-btn"
                      onClick={onMenuClick}
                      className="flex items-center justify-center p-1.5 rounded-md text-theme-muted hover:bg-theme-input hover:text-theme-primary cursor-pointer active-press focus:outline-none shrink-0 md:hidden"
                      title="Open Navigation"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="w-5 h-5"
                      >
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                    </button>
                  )}
                  <span className="text-theme-muted flex shrink-0">
                    {isVoiceChannel ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        className="w-5 h-5"
                      >
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-5 h-5"
                      >
                        <line x1="4" y1="9" x2="20" y2="9" />
                        <line x1="4" y1="15" x2="20" y2="15" />
                        <line x1="10" y1="3" x2="8" y2="21" />
                        <line x1="16" y1="3" x2="14" y2="21" />
                      </svg>
                    )}
                  </span>
                  <h3 className="text-[16px] font-bold tracking-tight truncate text-theme-primary">
                    {activeChannelName || activeDetails?.name || ''}
                  </h3>
                  {isActiveTyping && !isVoiceChannel && (
                    <span className="text-[11.5px] font-medium ml-2 animate-pulse text-(--accent-primary)">
                      {getTypingText()}…
                    </span>
                  )}
                </div>
              ) : (
                <>
                  {onMenuClick && (
                    <button
                      id="mobile-menu-btn"
                      onClick={onMenuClick}
                      className="flex items-center justify-center p-1.5 rounded-md text-theme-muted hover:bg-theme-input hover:text-theme-primary cursor-pointer active-press focus:outline-none shrink-0 mr-1 md:hidden"
                      title="Open Navigation"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="w-5 h-5"
                      >
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                    </button>
                  )}
                  <div
                    onClick={(e) => {
                      if (activeDetails?.id) {
                        handleOpenProfile(e, activeDetails.id);
                      }
                    }}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                  >
                    <Avatar
                      letter={activeDetails?.letter || ''}
                      url={
                        activeDetails?.avatarThumbnailUrl ||
                        activeDetails?.avatarUrl
                      }
                      status={activeStatus}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-bold tracking-tight truncate text-theme-primary">
                        {activeDetails?.name || ''}
                      </h3>
                      {isActiveTyping ? (
                        <span className="text-[11.5px] font-medium text-(--accent-primary)">
                          typing…
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11.5px] mt-0.5">
                          <PresenceDot status={activeStatus} size={7} />
                          <span
                            style={{
                              color:
                                PRESENCE_DOT_COLORS[
                                  activeStatus as PresenceStatus
                                ] || 'var(--text-muted)',
                            }}
                          >
                            {STATUS_TEXTS[activeStatus as PresenceStatus] ||
                              'Offline'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {/* Call button & Delete thread — only in DM mode */}
              {!isChannelMode && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="call-user-btn"
                    title="Start Voice Call"
                    className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-all duration-200 border-[1.5px] bg-(--accent-primary)/10 text-(--accent-primary) border-(--accent-primary)/20 hover:bg-(--accent-primary) hover:text-white hover:border-(--accent-primary) active-press"
                    onClick={handleStartCall}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-4 h-4"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    Call
                  </button>

                  <button
                    id="delete-thread-btn"
                    title="Delete thread"
                    className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-all duration-200 border-[1.5px] bg-(--danger-bg) text-(--danger) border-(--danger-border) hover:bg-(--danger) hover:text-white hover:border-(--danger) hover:shadow-[0_4px_14px_rgba(239,68,68,0.3)] active-press"
                    onClick={() =>
                      handleDeleteConversation(activeConversationId)
                    }
                  >
                    <IconTrash />
                    Delete
                  </button>
                </div>
              )}

              {/* Members Toggle Button — only in Channel mode */}
              {isChannelMode && onToggleMembersList && (
                <button
                  id="toggle-members-btn"
                  title="Toggle Member List"
                  onClick={onToggleMembersList}
                  className={`bg-transparent border-none cursor-pointer p-1.5 rounded-md flex items-center transition-all duration-150 active-press 
                  ${isMembersListOpen ? 'text-(--accent-primary)' : 'text-theme-muted hover:bg-theme-input hover:text-theme-primary'}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4.5 h-4.5"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {isVoiceChannel && activeGroupId && activeChannel ? (
            <div
              id="voice-dashboard-portal-container"
              className="flex-1 min-h-0 relative flex flex-col"
            />
          ) : (
            <>
              {/* Message Feed */}
              <div
                ref={feedContainerRef}
                onScroll={handleScroll}
                className={`flex-1 overflow-y-auto flex flex-col gap-3.5 bg-theme-chat ${isMobileScreen || isMobileView ? 'p-3' : 'p-5'}`}
              >
                {isFetchingMore && (
                  <div className="flex justify-center py-2 shrink-0">
                    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-(--accent-primary)" />
                  </div>
                )}
                {activeMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-[13.5px] text-theme-muted">
                    <IconChat />
                    <span>No messages yet. Send a greeting to begin.</span>
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isOut = msg.senderId === user.id;
                    const senderProfile = userProfiles[msg.senderId];
                    const senderName = isOut
                      ? user.username ||
                        user.displayName ||
                        user.email.split('@')[0]
                      : senderProfile?.username ||
                        senderProfile?.displayName ||
                        senderProfile?.email?.split('@')[0] ||
                        'User';

                    // Determine sender color if it's channel mode
                    let senderColor = 'inherit';
                    if (isChannelMode && activeGroup) {
                      const member = activeGroup.members?.find(
                        (mem) => mem.userId === msg.senderId,
                      );
                      if (member) {
                        // Use member.role for reliable owner detection
                        const isOwnerSender =
                          member.role === 'owner' ||
                          msg.senderId === activeGroup.ownerId;
                        if (isOwnerSender) {
                          // Owner color always wins over any role color
                          senderColor = '#eab308';
                        } else {
                          const memberRoleIds = member.roleIds || [];
                          const matchingRole = activeGroup.roles?.find((r) =>
                            memberRoleIds.includes(r.id),
                          );
                          senderColor = matchingRole?.color || 'inherit';
                        }
                      }
                    }

                    if (!isBubbleLayout) {
                      const letter = senderName[0]?.toUpperCase() || 'U';
                      const presenceStatus = isOut
                        ? onlineUsers[user.id] || user.status || 'online'
                        : onlineUsers[msg.senderId] || 'offline';
                      return (
                        <div
                          id={`msg-${msg.id}`}
                          key={msg.id}
                          onContextMenu={(e) => handleContextMenu(e, msg)}
                          onClick={(e) => {
                            if (isMobileScreen || isMobileView) {
                              handleMobileClick(e, msg);
                            }
                          }}
                          className="flex items-start gap-3 animate-fade-in group justify-between hover:bg-[rgba(0,0,0,0.015)] dark:hover:bg-[rgba(255,255,255,0.01)] rounded-xl px-2 py-1.5 transition-colors duration-150 -mx-2 cursor-pointer md:cursor-default"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div
                              onClick={(e) =>
                                handleOpenProfile(e, msg.senderId)
                              }
                              className="cursor-pointer active-press hover:scale-105 transition-all"
                            >
                              <Avatar
                                letter={letter}
                                url={
                                  isOut
                                    ? user.avatarThumbnailUrl || user.avatarUrl
                                    : senderProfile?.avatarThumbnailUrl ||
                                      senderProfile?.avatarUrl
                                }
                                status={presenceStatus}
                                size="sm"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span
                                  onClick={(e) =>
                                    handleOpenProfile(e, msg.senderId)
                                  }
                                  style={{
                                    color:
                                      senderColor !== 'inherit'
                                        ? senderColor
                                        : undefined,
                                  }}
                                  className={`text-[13.5px] font-bold cursor-pointer hover:underline ${isOut ? 'text-(--accent-primary)' : ''} ${!isOut && senderColor === 'inherit' ? 'text-theme-primary' : ''}`}
                                >
                                  {senderName}
                                </span>
                                <span className="text-[10.5px] text-theme-muted">
                                  {formatMessageTimestamp(msg.createdAt)}
                                </span>
                                {msg.isEdited && (
                                  <span className="text-[9.5px] text-theme-muted opacity-85 select-none">
                                    (edited)
                                  </span>
                                )}
                              </div>
                              {msg.parentMessage && (
                                <div
                                  onClick={() => {
                                    const el = document.getElementById(
                                      `msg-${msg.parentId}`,
                                    );
                                    if (el) {
                                      el.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'center',
                                      });
                                      el.classList.add('highlight-flash');
                                      setTimeout(
                                        () =>
                                          el.classList.remove(
                                            'highlight-flash',
                                          ),
                                        2000,
                                      );
                                    }
                                  }}
                                  className="flex items-center gap-1.5 text-[11px] text-theme-secondary bg-theme-input/50 border border-glass/30 rounded-lg px-2 py-1 mb-1.5 w-fit cursor-pointer hover:bg-theme-input transition-colors max-w-full"
                                  title="Click to jump to message"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    className="w-3 h-3 text-[var(--accent-primary)] shrink-0"
                                  >
                                    <polyline points="9 17 4 12 9 7" />
                                    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                                  </svg>
                                  <span className="font-bold text-theme-primary shrink-0">
                                    {userProfiles[msg.parentMessage.senderId]
                                      ?.displayName ||
                                      userProfiles[msg.parentMessage.senderId]
                                        ?.username ||
                                      (msg.parentMessage.senderId === user?.id
                                        ? 'You'
                                        : 'User')}
                                  </span>
                                  <span className="truncate opacity-80">
                                    {msg.parentMessage.content}
                                  </span>
                                </div>
                              )}
                              {editingMessageId === msg.id ? (
                                <div className="flex flex-col gap-2 mt-1 max-w-full">
                                  <textarea
                                    autoFocus
                                    value={editingContent}
                                    onChange={(e) =>
                                      setEditingContent(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEdit(msg.id);
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditingMessageId(null);
                                        setEditingContent('');
                                      }
                                    }}
                                    className="w-full bg-theme-input text-theme-primary border border-theme rounded-lg p-2 text-sm focus:outline-none focus:border-(--accent-primary) resize-none"
                                    rows={2}
                                  />
                                  <div className="flex gap-2 justify-start text-[11px] text-theme-muted">
                                    <span>
                                      escape to{' '}
                                      <button
                                        onClick={() => {
                                          setEditingMessageId(null);
                                          setEditingContent('');
                                        }}
                                        className="text-(--accent-primary) hover:underline cursor-pointer bg-transparent border-none p-0"
                                      >
                                        cancel
                                      </button>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      enter to{' '}
                                      <button
                                        onClick={() => handleSaveEdit(msg.id)}
                                        className="text-(--accent-primary) hover:underline cursor-pointer bg-transparent border-none p-0"
                                      >
                                        save
                                      </button>
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {msg.content && (
                                    <div
                                      className={`text-sm leading-relaxed text-theme-primary break-all ${isOnlyEmojis(msg.content) ? 'text-[60px] leading-15' : ''}`}
                                    >
                                      {isOnlyEmojis(msg.content)
                                        ? msg.content
                                        : renderMessageContent(
                                            msg.content,
                                            msg.isMarkdown,
                                          )}
                                    </div>
                                  )}
                                </>
                              )}
                              {renderMessageMedia(msg, setActiveMediaItem)}

                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5 select-none">
                                  {msg.reactions.map((react, rIdx) => {
                                    const hasReacted = react.userIds.includes(
                                      user?.id || '',
                                    );
                                    return (
                                      <button
                                        key={react.emoji + rIdx}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (activeConversationId) {
                                            socketManager.toggleReaction(
                                              msg.id,
                                              activeConversationId,
                                              react.emoji,
                                            );
                                          }
                                        }}
                                        className={`relative group/reaction flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] border cursor-pointer transition-all duration-150 active-press ${
                                          hasReacted
                                            ? 'bg-[var(--accent-ring)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-semibold'
                                            : 'bg-theme-input/40 border-glass/30 text-theme-secondary hover:bg-theme-input hover:border-glass'
                                        }`}
                                      >
                                        <span className="leading-none text-[16px]">
                                          {react.emoji}
                                        </span>
                                        <span>{react.userIds.length}</span>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/reaction:flex flex-col items-center pointer-events-none z-[9999] animate-fade-in">
                                          <div className="bg-black/90 dark:bg-zinc-900/95 backdrop-blur-md text-white text-[10.5px] font-medium py-1.5 px-3 rounded-xl whitespace-nowrap border border-white/10 dark:border-zinc-800 shadow-xl text-center leading-normal">
                                            <span className="font-bold text-[var(--accent-primary)] mb-0.5 block">
                                              {react.emoji} Reacted by
                                            </span>
                                            <span className="opacity-90">
                                              {getReactingUserNames(
                                                react.userIds,
                                              ).join(', ')}
                                            </span>
                                          </div>
                                          <div className="w-2.5 h-2.5 bg-black/90 dark:bg-zinc-900/95 border-r border-b border-white/10 dark:border-zinc-800 rotate-45 -mt-1.25" />
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {editingMessageId !== msg.id && (
                            <div
                              className={` hidden md:flex items-center gap-1 transition-opacity duration-150 shrink-0 self-center ${
                                activeReactionMessageId === msg.id
                                  ? 'opacity-100 pointer-events-auto'
                                  : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <button
                                onClick={() => setReplyingToMessage(msg)}
                                className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] active-press"
                                title="Reply to message"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  className="w-4 h-4"
                                >
                                  <polyline points="9 17 4 12 9 7" />
                                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                                </svg>
                              </button>

                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setActiveReactionMessageId(msg.id)
                                  }
                                  className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] active-press"
                                  title="Add reaction"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    className="w-4 h-4"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                    <line
                                      x1="9"
                                      y1="9"
                                      x2="9.01"
                                      y2="9"
                                      strokeWidth="2.5"
                                    />
                                    <line
                                      x1="15"
                                      y1="9"
                                      x2="15.01"
                                      y2="9"
                                      strokeWidth="2.5"
                                    />
                                  </svg>
                                </button>
                                {/* Reaction picker is now a centered modal — rendered at component root */}
                              </div>

                              {isOut && (
                                <button
                                  onClick={() => handleStartEdit(msg)}
                                  className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] active-press"
                                  title="Edit message"
                                >
                                  <IconCompose />
                                </button>
                              )}
                              {(isOut || canDeleteOthers) && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="msg-delete-btn flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-[var(--danger-bg)] text-[var(--danger)] active-press"
                                  title="Delete message"
                                >
                                  <IconTrash />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const letter = senderName[0]?.toUpperCase() || 'U';
                    const presenceStatus = isOut
                      ? onlineUsers[user.id] || user.status || 'online'
                      : onlineUsers[msg.senderId] || 'offline';

                    return (
                      <div
                        id={`msg-${msg.id}`}
                        key={msg.id}
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                        onClick={(e) => {
                          if (isMobileScreen || isMobileView) {
                            handleMobileClick(e, msg);
                          }
                        }}
                        className={`flex items-start gap-2.5 group max-w-[85%] md:max-w-[72%] animate-fade-in cursor-pointer md:cursor-default ${isOut ? 'self-end' : 'self-start'}`}
                      >
                        {isOut && editingMessageId !== msg.id && (
                          <div
                            className={`hidden md:flex items-center gap-1 transition-opacity duration-150 shrink-0 self-center ${
                              activeReactionMessageId === msg.id
                                ? 'opacity-100 pointer-events-auto'
                                : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <button
                              onClick={() => setReplyingToMessage(msg)}
                              className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] active-press"
                              title="Reply to message"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                className="w-4 h-4"
                              >
                                <polyline points="9 17 4 12 9 7" />
                                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                              </svg>
                            </button>

                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveReactionMessageId(msg.id)
                                }
                                className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] active-press"
                                title="Add reaction"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  className="w-4 h-4"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                  <line
                                    x1="9"
                                    y1="9"
                                    x2="9.01"
                                    y2="9"
                                    strokeWidth="2.5"
                                  />
                                  <line
                                    x1="15"
                                    y1="9"
                                    x2="15.01"
                                    y2="9"
                                    strokeWidth="2.5"
                                  />
                                </svg>
                              </button>
                              {/* Reaction picker is now a centered modal — rendered at component root */}
                            </div>
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] active-press"
                              title="Edit message"
                            >
                              <IconCompose />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="msg-delete-btn flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-[var(--danger-bg)] text-[var(--danger)] active-press"
                              title="Delete message"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        )}
                        {!isOut && isChannelMode && (
                          <div
                            onClick={(e) => handleOpenProfile(e, msg.senderId)}
                            className="shrink-0 mt-0.5 cursor-pointer active-press hover:scale-105 transition-all"
                          >
                            <Avatar
                              letter={letter}
                              url={
                                senderProfile?.avatarThumbnailUrl ||
                                senderProfile?.avatarUrl
                              }
                              status={presenceStatus}
                              size="sm"
                            />
                          </div>
                        )}
                        <div
                          className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} min-w-0`}
                        >
                          {!isOut && isChannelMode && (
                            <span
                              onClick={(e) =>
                                handleOpenProfile(e, msg.senderId)
                              }
                              style={{
                                color:
                                  senderColor !== 'inherit'
                                    ? senderColor
                                    : undefined,
                              }}
                              className="text-[11.5px] font-bold mb-1 ml-1.5 text-theme-secondary cursor-pointer hover:underline"
                            >
                              {senderName}
                            </span>
                          )}
                          {msg.parentMessage && (
                            <div
                              onClick={() => {
                                const el = document.getElementById(
                                  `msg-${msg.parentId}`,
                                );
                                if (el) {
                                  el.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                  });
                                  el.classList.add('highlight-flash');
                                  setTimeout(
                                    () =>
                                      el.classList.remove('highlight-flash'),
                                    2000,
                                  );
                                }
                              }}
                              className="flex items-center gap-1.5 text-[11px] text-theme-secondary bg-theme-input/50 border border-glass/30 rounded-lg px-2 py-1 mb-1 w-fit cursor-pointer hover:bg-theme-input transition-colors max-w-full"
                              title="Click to jump to message"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                className="w-3 h-3 text-[var(--accent-primary)] shrink-0"
                              >
                                <polyline points="9 17 4 12 9 7" />
                                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                              </svg>
                              <span className="font-bold text-theme-primary shrink-0">
                                {userProfiles[msg.parentMessage.senderId]
                                  ?.displayName ||
                                  userProfiles[msg.parentMessage.senderId]
                                    ?.username ||
                                  (msg.parentMessage.senderId === user?.id
                                    ? 'You'
                                    : 'User')}
                              </span>
                              <span className="truncate opacity-80">
                                {msg.parentMessage.content}
                              </span>
                            </div>
                          )}
                          {editingMessageId === msg.id ? (
                            <div className="flex flex-col gap-2 mt-1 w-65 sm:w-87.5">
                              <textarea
                                autoFocus
                                value={editingContent}
                                onChange={(e) =>
                                  setEditingContent(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit(msg.id);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingMessageId(null);
                                    setEditingContent('');
                                  }
                                }}
                                className="w-full bg-theme-input text-theme-primary border border-theme rounded-lg p-2 text-sm focus:outline-none focus:border-(--accent-primary) resize-none"
                                rows={2}
                              />
                              <div className="flex gap-2 justify-end text-[11px] text-theme-muted">
                                <span>
                                  escape to{' '}
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(null);
                                      setEditingContent('');
                                    }}
                                    className="text-(--accent-primary) hover:underline cursor-pointer bg-transparent border-none p-0"
                                  >
                                    cancel
                                  </button>
                                </span>
                                <span>•</span>
                                <span>
                                  enter to{' '}
                                  <button
                                    onClick={() => handleSaveEdit(msg.id)}
                                    className="text-(--accent-primary) hover:underline cursor-pointer bg-transparent border-none p-0"
                                  >
                                    save
                                  </button>
                                </span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.content && (
                                <div
                                  className={
                                    isOnlyEmojis(msg.content)
                                      ? `text-[60px] leading-15 wrap-break-word select-all ${isOut ? 'text-right' : 'text-left'}`
                                      : `px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed wrap-break-word ${isOut ? 'msg-bubble-out' : 'msg-bubble-in'}`
                                  }
                                >
                                  {isOnlyEmojis(msg.content)
                                    ? msg.content
                                    : renderMessageContent(
                                        msg.content,
                                        msg.isMarkdown,
                                      )}
                                </div>
                              )}
                            </>
                          )}
                          {renderMessageMedia(msg, setActiveMediaItem)}

                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5 select-none">
                              {msg.reactions.map((react, rIdx) => {
                                const hasReacted = react.userIds.includes(
                                  user?.id || '',
                                );
                                return (
                                  <button
                                    key={react.emoji + rIdx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (activeConversationId) {
                                        socketManager.toggleReaction(
                                          msg.id,
                                          activeConversationId,
                                          react.emoji,
                                        );
                                      }
                                    }}
                                    className={`relative group/reaction flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] border cursor-pointer transition-all duration-150 active-press ${
                                      hasReacted
                                        ? 'bg-[var(--accent-ring)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-semibold'
                                        : 'bg-theme-input/40 border-glass/30 text-theme-secondary hover:bg-theme-input hover:border-glass'
                                    }`}
                                  >
                                    <span className="leading-none text-[16px]">
                                      {react.emoji}
                                    </span>
                                    <span>{react.userIds.length}</span>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/reaction:flex flex-col items-center pointer-events-none z-[9999] animate-fade-in">
                                      <div className="bg-black/90 dark:bg-zinc-900/95 backdrop-blur-md text-white text-[10.5px] font-medium py-1.5 px-3 rounded-xl whitespace-nowrap border border-white/10 dark:border-zinc-800 shadow-xl text-center leading-normal">
                                        <span className="font-bold text-[var(--accent-primary)] mb-0.5 block">
                                          {react.emoji} Reacted by
                                        </span>
                                        <span className="opacity-90">
                                          {getReactingUserNames(
                                            react.userIds,
                                          ).join(', ')}
                                        </span>
                                      </div>
                                      <div className="w-2.5 h-2.5 bg-black/90 dark:bg-zinc-900/95 border-r border-b border-white/10 dark:border-zinc-800 rotate-45 -mt-1.25" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 mt-1 px-1 select-none">
                            <span className="text-[10px] text-theme-muted">
                              {formatMessageTimestamp(msg.createdAt)}
                            </span>
                            {msg.isEdited && (
                              <span className="text-[9.5px] text-theme-muted opacity-85 select-none">
                                (edited)
                              </span>
                            )}
                            {isOut && !isChannelMode && (
                              <span
                                className={`inline-flex items-center ${msg.isRead ? 'text-(--accent-primary)' : 'text-theme-muted'}`}
                                title={msg.isRead ? 'Read' : 'Sent'}
                              >
                                {msg.isRead ? (
                                  <IconDoubleCheck />
                                ) : (
                                  <IconCheck />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {!isOut && editingMessageId !== msg.id && (
                          <div
                            className={`hidden md:flex items-center gap-1 transition-opacity duration-150 shrink-0 self-center ${
                              activeReactionMessageId === msg.id
                                ? 'opacity-100 pointer-events-auto'
                                : 'opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <button
                              onClick={() => setReplyingToMessage(msg)}
                              className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] active-press"
                              title="Reply to message"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                className="w-4 h-4"
                              >
                                <polyline points="9 17 4 12 9 7" />
                                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                              </svg>
                            </button>
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveReactionMessageId(msg.id)
                                }
                                className="flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-theme-input text-theme-secondary hover:text-[var(--accent-primary)] active-press"
                                title="Add reaction"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  className="w-4 h-4"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                  <line
                                    x1="9"
                                    y1="9"
                                    x2="9.01"
                                    y2="9"
                                    strokeWidth="2.5"
                                  />
                                  <line
                                    x1="15"
                                    y1="9"
                                    x2="15.01"
                                    y2="9"
                                    strokeWidth="2.5"
                                  />
                                </svg>
                              </button>
                              {/* Reaction picker is now a centered modal — rendered at component root */}
                            </div>
                            {canDeleteOthers && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="msg-delete-btn flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-[var(--danger-bg)] text-[var(--danger)] active-press"
                                title="Delete message"
                              >
                                <IconTrash />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Typing indicator */}
                {isActiveTyping && (
                  <div className="self-start flex items-center gap-2 px-4 py-2.5 rounded-[18px] animate-fade-in msg-bubble-in text-[13px] text-theme-secondary">
                    {isChannelMode ? (
                      <>
                        <span className="font-semibold text-theme-primary">
                          {getTypingText()}
                        </span>
                        <div className="flex items-center gap-1 ml-1">
                          <span
                            className="typing-dot"
                            style={{
                              animationDelay: '0s',
                              width: '5px',
                              height: '5px',
                            }}
                          />
                          <span
                            className="typing-dot"
                            style={{
                              animationDelay: '0.15s',
                              width: '5px',
                              height: '5px',
                            }}
                          />
                          <span
                            className="typing-dot"
                            style={{
                              animationDelay: '0.30s',
                              width: '5px',
                              height: '5px',
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <span
                          className="typing-dot"
                          style={{ animationDelay: '0s' }}
                        />
                        <span
                          className="typing-dot"
                          style={{ animationDelay: '0.15s' }}
                        />
                        <span
                          className="typing-dot"
                          style={{ animationDelay: '0.30s' }}
                        />
                      </>
                    )}
                  </div>
                )}

                <div ref={feedEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-2 bg-transparent shrink-0">
                <div className="glass-panel p-2.5 border-glass bg-theme-sidebar/35 shadow-[0_10px_35px_rgba(0,0,0,0.15)] rounded-2xl">
                  {replyingToMessage && (
                    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-theme-input border border-glass mb-2.5 animate-fade-in">
                      <div className="flex items-center gap-2 text-[12.5px] min-w-0">
                        <span className="text-(--accent-primary) font-semibold flex items-center gap-1">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="w-3.5 h-3.5"
                          >
                            <polyline points="9 17 4 12 9 7" />
                            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                          </svg>
                          Replying to
                        </span>
                        <span className="font-bold text-theme-primary truncate">
                          {userProfiles[replyingToMessage.senderId]
                            ?.displayName ||
                            (userProfiles[replyingToMessage.senderId]?.username
                              ? `@${userProfiles[replyingToMessage.senderId].username}`
                              : null) ||
                            (replyingToMessage.senderId === user?.id
                              ? 'You'
                              : 'User')}
                        </span>
                        <span className="text-theme-secondary opacity-75 truncate max-w-md italic">
                          "{replyingToMessage.content}"
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingToMessage(null)}
                        className="p-1 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-theme-secondary hover:text-theme-primary hover:bg-theme-input/50 transition-colors active-press"
                        title="Cancel reply"
                      >
                        <IconX size={12} />
                      </button>
                    </div>
                  )}
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2.5 max-w-full">
                      {attachedFiles.map((file, idx) => (
                        <div
                          key={file.url + idx}
                          className="flex items-center gap-3 p-2 rounded-xl border border-glass bg-theme-input/80 backdrop-blur-md animate-fade-in text-[13px] relative max-w-50 shadow-sm"
                        >
                          {file.type.startsWith('image/') ? (
                            <img
                              src={file.url}
                              alt="Preview"
                              className="w-10 h-10 object-cover rounded-lg shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-(--accent-primary) text-white text-[16px] shrink-0">
                              📄
                            </div>
                          )}
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="font-semibold truncate text-theme-primary text-[12px]">
                              {file.name}
                            </div>
                            <div className="text-[10px] text-theme-muted mt-0.5">
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              deleteUploadedFile(file.url);
                              if (file.thumbnailUrl) {
                                deleteUploadedFile(file.thumbnailUrl);
                              }
                              setAttachedFiles((prev) =>
                                prev.filter((f) => f.url !== file.url),
                              );
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-(--danger-bg) text-(--danger) border-none cursor-pointer hover:bg-(--danger) hover:text-white transition-all duration-150 active-press shadow-sm"
                            title="Remove attachment"
                          >
                            <IconX size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {!canSendMessages ? (
                    <div className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-dashed border-[rgba(255,255,255,0.06)] text-theme-muted font-semibold text-[13.5px] cursor-not-allowed select-none w-full box-border">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-50 mr-0.5"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      {isChannelMode && activeChannel && !hasChannelWriteAccess
                        ? 'This channel is read-only.'
                        : 'You do not have permission to send messages in this group.'}
                    </div>
                  ) : (
                    <form
                      className="flex gap-2.5 items-end"
                      onSubmit={handleSendMessage}
                    >
                      <div
                        className="relative hidden md:block"
                        ref={emojiPickerRef}
                      >
                        <button
                          type="button"
                          disabled={!canSendMessages}
                          onClick={handleEmojiPickerToggle}
                          className="w-11.5 h-11.5 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 bg-theme-input text-theme-muted hover:bg-(--theme-btn-hover) hover:text-theme-primary disabled:opacity-40 disabled:cursor-not-allowed active-press border border-glass"
                          title={
                            canSendMessages
                              ? 'Choose an emoji'
                              : isChannelMode &&
                                  activeChannel &&
                                  !hasChannelWriteAccess
                                ? 'This channel is read-only'
                                : 'You do not have permission to send messages'
                          }
                        >
                          <IconEmoji size={20} />
                        </button>

                        {showEmojiPicker && (
                          <div
                            ref={emojiPickerContainerRef}
                            className="absolute z-50 shadow-(--glass-shadow) rounded-2xl overflow-hidden border-[1.5px] border-glass bg-(--glass-bg) backdrop-blur-[20px] transition-opacity duration-150 ease-out"
                            style={{ ...emojiPickerStyle }}
                          >
                            <EmojiPicker
                              onEmojiSelect={onEmojiSelect}
                              theme="auto"
                              previewPosition="none"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={
                          uploading || !canAttachFiles || !canSendMessages
                        }
                        className="w-11.5 h-11.5 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 bg-theme-input text-theme-muted hover:bg-(--theme-btn-hover) hover:text-theme-primary disabled:opacity-40 disabled:cursor-not-allowed active-press border border-glass"
                        title={
                          !canSendMessages
                            ? isChannelMode &&
                              activeChannel &&
                              !hasChannelWriteAccess
                              ? 'This channel is read-only'
                              : 'You do not have permission to send messages'
                            : !canAttachFiles
                              ? 'You do not have permission to attach files'
                              : 'Attach a file'
                        }
                      >
                        {uploading ? (
                          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-(--text-primary)" />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="w-4.5 h-4.5"
                          >
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        multiple
                      />
                      <div className="relative flex-1 flex flex-col justify-end">
                        {mentionQuery && emojiResults.length > 0 && (
                          <div className="absolute bottom-full left-0 mb-2 w-75 max-h-50 overflow-y-auto bg-theme-sidebar border border-theme rounded-xl shadow-(--glass-shadow) z-50 flex flex-col p-1">
                            {emojiResults.map((emoji: any) => (
                              <button
                                key={emoji.id}
                                type="button"
                                className="flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-theme-input active-press cursor-pointer border-none bg-transparent"
                                onClick={() => {
                                  const val = messageInput;
                                  const newText =
                                    val.slice(0, mentionQuery.start) +
                                    emoji.skins[0].native +
                                    val.slice(mentionQuery.end);
                                  setMessageInput(newText);
                                  setMentionQuery(null);
                                  setEmojiResults([]);
                                  document
                                    .getElementById('message-input')
                                    ?.focus();
                                }}
                              >
                                <span className="text-[20px] leading-none">
                                  {emoji.skins[0].native}
                                </span>
                                <span className="text-[13px] text-theme-primary">
                                  :{emoji.id}:
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        {atMentionQuery &&
                          isChannelMode &&
                          activeGroup &&
                          matchingMentions.length > 0 && (
                            <div className="absolute bottom-full left-0 mb-2 w-75 max-h-50 overflow-y-auto bg-theme-sidebar border border-theme rounded-xl shadow-(--glass-shadow) z-50 flex flex-col p-1">
                              {matchingMentions.map((item, idx) => {
                                const isActive = idx === activeSuggestIndex;
                                if (item.isEveryone) {
                                  return (
                                    <button
                                      key="everyone"
                                      type="button"
                                      className={`flex items-center gap-2.5 px-3 py-2 text-left rounded-lg active-press cursor-pointer border-none ${
                                        isActive
                                          ? 'bg-theme-input text-theme-secondary font-semibold'
                                          : 'bg-transparent text-theme-muted hover:bg-theme-input/50'
                                      }`}
                                      onClick={() => {
                                        const val = messageInput;
                                        const newText =
                                          val.slice(0, atMentionQuery.start) +
                                          '@everyone ' +
                                          val.slice(atMentionQuery.end);
                                        setMessageInput(newText);
                                        setAtMentionQuery(null);
                                        document
                                          .getElementById('message-input')
                                          ?.focus();
                                      }}
                                    >
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-(--accent-primary) text-white text-[12px] font-bold shrink-0">
                                        📢
                                      </div>
                                      <div className="flex flex-col">
                                        <span
                                          className={`text-[13px] font-bold ${isActive ? 'text-theme-secondary' : 'text-theme-primary'}`}
                                        >
                                          @everyone
                                        </span>
                                        <span className="text-[10.5px] text-theme-muted">
                                          Notify all members
                                        </span>
                                      </div>
                                    </button>
                                  );
                                }

                                const member = item.member;
                                const memberName = item.name;
                                const letter =
                                  memberName[0]?.toUpperCase() || 'U';

                                const isOwnerMember =
                                  activeGroup.ownerId === member.userId;
                                const memberRoleIds = member.roleIds || [];
                                const topRole = activeGroup.roles?.find((r) =>
                                  memberRoleIds.includes(r.id),
                                );
                                const memberColor = isOwnerMember
                                  ? '#eab308'
                                  : topRole?.color || undefined;

                                return (
                                  <button
                                    key={member.id}
                                    type="button"
                                    className={`flex items-center gap-2.5 px-3 py-2 text-left rounded-lg active-press cursor-pointer border-none ${
                                      isActive
                                        ? 'bg-theme-input font-semibold'
                                        : 'bg-transparent hover:bg-theme-input/50'
                                    }`}
                                    onClick={() => {
                                      const val = messageInput;
                                      const newText =
                                        val.slice(0, atMentionQuery.start) +
                                        `@${memberName} ` +
                                        val.slice(atMentionQuery.end);
                                      setMessageInput(newText);
                                      setAtMentionQuery(null);
                                      document
                                        .getElementById('message-input')
                                        ?.focus();
                                    }}
                                  >
                                    <Avatar
                                      letter={letter}
                                      url={
                                        member.user?.avatarThumbnailUrl ||
                                        member.user?.avatarUrl
                                      }
                                      size="xs"
                                    />
                                    <div className="flex flex-col">
                                      <span
                                        className={`text-[13px] font-bold ${!memberColor ? (isActive ? 'text-theme-secondary' : 'text-theme-primary') : ''}`}
                                        style={
                                          memberColor
                                            ? { color: memberColor }
                                            : undefined
                                        }
                                      >
                                        @{memberName}
                                      </span>
                                      {member.user?.displayName && (
                                        <span className="text-[10px] text-theme-muted">
                                          {member.user.displayName}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        {isMdMode && (
                          <div className="flex items-center justify-between mb-2 px-2">
                            {/* Toggle Icon Button */}
                            <button
                              type="button"
                              onClick={() =>
                                setMdTab(
                                  mdTab === 'write' ? 'preview' : 'write',
                                )
                              }
                              className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-(--accent-primary) transition-colors flex items-center gap-1.5"
                              title={mdTab === 'write' ? 'Preview' : 'Edit'}
                            >
                              {mdTab === 'write' ? (
                                <IconEye />
                              ) : (
                                <IconCompose />
                              )}
                              <span className="text-[12px] font-semibold">
                                {mdTab === 'write' ? 'Preview' : 'Edit'}
                              </span>
                            </button>

                            {/* Formatting Buttons */}
                            {mdTab === 'write' && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => applyFormat('# ')}
                                  className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center min-w-[24px]"
                                  title="Heading 1"
                                >
                                  <span className="text-[11px] font-bold">
                                    H1
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyFormat('## ')}
                                  className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center min-w-[24px]"
                                  title="Heading 2"
                                >
                                  <span className="text-[11px] font-bold">
                                    H2
                                  </span>
                                </button>
                                <div className="w-px h-4 bg-theme/20 mx-1" />
                                <button
                                  type="button"
                                  onClick={() => applyFormat('**', '**')}
                                  className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors"
                                  title="Bold"
                                >
                                  <IconBold />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyFormat('*', '*')}
                                  className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors"
                                  title="Italic"
                                >
                                  <IconItalic />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyFormat('~~', '~~')}
                                  className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors"
                                  title="Strikethrough"
                                >
                                  <IconStrikethrough />
                                </button>
                                <div className="w-px h-4 bg-theme/20 mx-1" />
                                <button
                                  type="button"
                                  onClick={() => applyFormat('`', '`')}
                                  className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors"
                                  title="Inline Code"
                                >
                                  <IconCode />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyFormat('```\n', '\n```')}
                                  className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center w-6 h-6"
                                  title="Code Block"
                                >
                                  <span className="text-[10px] font-bold mt-0.5">
                                    {'</>'}
                                  </span>
                                </button>
                                <div className="w-px h-4 bg-theme/20 mx-1" />
                                <button
                                  type="button"
                                  onClick={() => applyFormat('[', '](url)')}
                                  className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors"
                                  title="Link"
                                >
                                  <IconLink />
                                </button>
                                <div className="w-px h-4 bg-theme/20 mx-1" />
                                <button
                                  type="button"
                                  onClick={() => applyFormat('- ')}
                                  className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors"
                                  title="List"
                                >
                                  <IconList />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyFormat('> ')}
                                  className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors"
                                  title="Quote"
                                >
                                  <IconQuote />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {(!isMdMode || mdTab === 'write') && (
                          <textarea
                            ref={textareaRef}
                            id="message-input"
                            disabled={!canSendMessages}
                            className={`input-base w-full block rounded-xl px-4 text-[14px] resize-none leading-normal bg-theme-input/40 border-[1.5px] border-glass text-theme-primary focus:outline-none focus:border-(--accent-primary) focus:ring-[3px] focus:ring-(--accent-ring) disabled:opacity-50 disabled:cursor-not-allowed box-border ${isMdMode ? 'max-h-64' : 'max-h-30'}`}
                            style={{
                              minHeight: isMdMode ? '100px' : '46px',
                              paddingTop: '11px',
                              paddingBottom: '11px',
                            }}
                            placeholder={
                              isMdMode
                                ? 'Markdown Mode...'
                                : canSendMessages
                                  ? isMobileScreen
                                    ? 'Type a message…'
                                    : 'Type a message… (Enter to send)'
                                  : isChannelMode &&
                                      activeChannel &&
                                      !hasChannelWriteAccess
                                    ? 'This channel is read-only.'
                                    : 'You do not have permission to send messages in this group.'
                            }
                            rows={isMdMode ? 4 : 1}
                            value={messageInput}
                            onChange={handleInputChange}
                            onSelect={handleTextareaSelect}
                            onKeyDown={(e) => {
                              if (
                                atMentionQuery &&
                                isChannelMode &&
                                activeGroup &&
                                matchingMentions.length > 0
                              ) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setActiveSuggestIndex(
                                    (prev) =>
                                      (prev + 1) % matchingMentions.length,
                                  );
                                  return;
                                }
                                if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setActiveSuggestIndex(
                                    (prev) =>
                                      (prev - 1 + matchingMentions.length) %
                                      matchingMentions.length,
                                  );
                                  return;
                                }
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const selected =
                                    matchingMentions[activeSuggestIndex];
                                  if (selected) {
                                    const val = messageInput;
                                    const inserted = selected.isEveryone
                                      ? '@everyone '
                                      : `@${selected.name} `;
                                    const newText =
                                      val.slice(0, atMentionQuery.start) +
                                      inserted +
                                      val.slice(atMentionQuery.end);
                                    setMessageInput(newText);
                                    setAtMentionQuery(null);
                                    setTimeout(() => {
                                      document
                                        .getElementById('message-input')
                                        ?.focus();
                                    }, 0);
                                  }
                                  return;
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setAtMentionQuery(null);
                                  return;
                                }
                              }

                              if (e.key === 'Escape' && replyingToMessage) {
                                e.preventDefault();
                                setReplyingToMessage(null);
                                return;
                              }

                              if (
                                e.key === 'Enter' &&
                                !e.shiftKey &&
                                !isMdMode
                              ) {
                                e.preventDefault();
                                if (canSendMessages) {
                                  handleSendMessage(e);
                                }
                              }
                            }}
                            onPaste={(e) => {
                              const items = e.clipboardData?.items;
                              if (items) {
                                const filesToPaste: File[] = [];
                                for (let i = 0; i < items.length; i++) {
                                  if (items[i].kind === 'file') {
                                    const file = items[i].getAsFile();
                                    if (file) {
                                      filesToPaste.push(file);
                                    }
                                  }
                                }
                                if (filesToPaste.length > 0) {
                                  e.preventDefault();
                                  processFiles(filesToPaste);
                                }
                              }
                            }}
                          />
                        )}
                        {isMdMode && mdTab === 'preview' && (
                          <div
                            className="input-base w-full block rounded-xl px-4 text-[14px] leading-normal bg-theme-input/40 border-[1.5px] border-glass text-theme-primary box-border overflow-y-auto max-h-64 markdown-body"
                            style={{
                              minHeight: '100px',
                              paddingTop: '11px',
                              paddingBottom: '11px',
                            }}
                          >
                            {messageInput.trim() ? (
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {messageInput}
                              </ReactMarkdown>
                            ) : (
                              <span className="text-theme-muted italic">
                                Nothing to preview
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        id="send-message-btn"
                        type="submit"
                        disabled={
                          (!messageInput.trim() &&
                            attachedFiles.length === 0) ||
                          !canSendMessages
                        }
                        className="btn-send w-11.5 h-11.5 rounded-xl shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-(--btn-shadow) active-press"
                      >
                        <IconSend />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* Empty state - Beautiful Welcome Dashboard Hub */
        <div className="flex-1 flex flex-col p-6 md:p-8 bg-theme-chat rounded-2xl overflow-y-auto animate-fade-in relative">
          {/* Decorative Glowing Orbs in Background */}
          <div className="absolute top-10 right-10 w-64 h-64 bg-(--bg-glow-1) rounded-full blur-3xl pointer-events-none opacity-40 animate-pulse" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-(--bg-glow-2) rounded-full blur-3xl pointer-events-none opacity-40 animate-pulse" />

          {/* Top Widget: Live Clock & Date */}
          <div className="self-end glass-panel px-4 py-2 flex items-center gap-3 text-sm font-semibold shrink-0 mb-8 border-glass bg-theme-sidebar/30">
            <span className="text-theme-secondary font-mono tracking-wider">
              {timeStr}
            </span>
            <div className="w-1 h-3 rounded bg-theme-muted" />
            <span className="text-theme-muted">
              {new Date().toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* Hero Welcome Banner */}
          <div className="flex-1 flex flex-col items-center justify-center text-center my-6 max-w-2xl mx-auto shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden animate-float border border-glass bg-theme-sidebar shadow-lg">
              <img
                src="/logo.png"
                alt="RelayFlow Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-[28px] md:text-[34px] font-extrabold tracking-tight text-theme-primary leading-tight">
              {greeting},{' '}
              <span className="gradient-text font-black">
                {user?.displayName || `@${user?.username}`}
              </span>
            </h1>

            <p className="text-[14.5px] mt-3.5 text-theme-secondary leading-relaxed max-w-md opacity-85">
              Welcome to your RelayFlow Workspace. Chat with team members,
              connect over voice rooms, and stay organized.
            </p>
          </div>

          {/* Grid of Interactive Quick Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full mb-6 shrink-0">
            <div
              onClick={() => setIsComposeOpen(true)}
              className="glass-panel p-4.5 border-glass bg-theme-sidebar/20 hover:bg-theme-sidebar/40 hover:border-(--accent-primary) cursor-pointer hover:shadow-lg transition-all duration-300 group flex items-start gap-4 active-press"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary) group-hover:bg-(--accent-primary) group-hover:text-white transition-all duration-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-5 h-5"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[14px] text-theme-primary mb-1">
                  New Message
                </h4>
                <p className="text-[12.5px] text-theme-muted leading-snug">
                  Start a direct messaging thread with any colleague.
                </p>
              </div>
            </div>

            <div
              onClick={() => dispatch(setActiveConversation('friends'))}
              className="glass-panel p-4.5 border-glass bg-theme-sidebar/20 hover:bg-theme-sidebar/40 hover:border-(--accent-primary) cursor-pointer hover:shadow-lg transition-all duration-300 group flex items-start gap-4 active-press"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary) group-hover:bg-(--accent-primary) group-hover:text-white transition-all duration-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-5 h-5"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[14px] text-theme-primary mb-1">
                  Friends Dashboard
                </h4>
                <p className="text-[12.5px] text-theme-muted leading-snug">
                  See who is online, send requests, and add connections.
                </p>
              </div>
            </div>

            <div
              onClick={() => {
                document.getElementById('rail-create-group-btn')?.click();
              }}
              className="glass-panel p-4.5 border-glass bg-theme-sidebar/20 hover:bg-theme-sidebar/40 hover:border-(--accent-primary) cursor-pointer hover:shadow-lg transition-all duration-300 group flex items-start gap-4 active-press"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary) group-hover:bg-(--accent-primary) group-hover:text-white transition-all duration-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-5 h-5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[14px] text-theme-primary mb-1">
                  Create a Group
                </h4>
                <p className="text-[12.5px] text-theme-muted leading-snug">
                  Set up a new space for team collaboration and discussion.
                </p>
              </div>
            </div>

            <div
              onClick={() => {
                const btn =
                  document.getElementById('profile-settings-btn') ||
                  document.getElementById('channel-sidebar-settings-btn');
                if (btn) {
                  btn.click();
                }
              }}
              className="glass-panel p-4.5 border-glass bg-theme-sidebar/20 hover:bg-theme-sidebar/40 hover:border-(--accent-primary) cursor-pointer hover:shadow-lg transition-all duration-300 group flex items-start gap-4 active-press"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary) group-hover:bg-(--accent-primary) group-hover:text-white transition-all duration-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-5 h-5"
                >
                  <path d="M12 22C17.52 22 22 17.52 22 12S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[14px] text-theme-primary mb-1">
                  Theme & Profile
                </h4>
                <p className="text-[12.5px] text-theme-muted leading-snug">
                  Change color skins, set statuses, and adjust configurations.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {contextMenu &&
        liveContextMenuMsg &&
        ReactDOM.createPortal(
          <div
            ref={contextMenuRef}
            className="convo-context-menu message-context-menu"
            style={{
              top: adjustedContextMenu
                ? `${adjustedContextMenu.y}px`
                : `${contextMenu.y}px`,
              left: adjustedContextMenu
                ? `${adjustedContextMenu.x}px`
                : `${contextMenu.x}px`,
              opacity: adjustedContextMenu ? 1 : 0,
            }}
            role="menu"
            aria-label="Message options"
          >
            {contextMenu.message.senderId === user?.id && (
              <button
                className="convo-context-menu-item"
                role="menuitem"
                onClick={() => {
                  handleStartEdit(contextMenu.message);
                  setContextMenu(null);
                }}
              >
                <IconCompose />
                <span>Edit Message</span>
              </button>
            )}
            {(contextMenu.message.senderId === user?.id || canDeleteOthers) && (
              <button
                className="convo-context-menu-item danger"
                role="menuitem"
                onClick={() => {
                  handleDeleteMessage(contextMenu.message.id);
                  setContextMenu(null);
                }}
              >
                <IconTrash />
                <span>Delete Message</span>
              </button>
            )}
            <button
              className="convo-context-menu-item"
              role="menuitem"
              onClick={() => {
                setReplyingToMessage(contextMenu.message);
                setContextMenu(null);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                width="15"
                height="15"
              >
                <polyline points="9 17 4 12 9 7" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              <span>Reply to Message</span>
            </button>
            {isChannelMode && (
              <>
                <div className="convo-context-menu-separator" />
                <div
                  className="convo-context-menu-item group relative flex justify-between items-center cursor-pointer"
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="15"
                      height="15"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>
                      Read by {liveContextMenuMsg.readBy?.length || 0}
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="12"
                    height="12"
                    className="opacity-60"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <div
                    className="hidden group-hover:block absolute w-64 bg-(--dropdown-bg) border border-glass rounded-[10px] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.35),0_0_0_1px_var(--glass-border)] backdrop-blur-lg z-10000 animate-[fadeIn_0.15s_ease-out_forwards]"
                    style={{
                      ...(adjustedContextMenu?.subMenuLeft
                        ? { right: '100%', left: 'auto', marginRight: '4px' }
                        : { left: '100%', right: 'auto', marginLeft: '4px' }),
                      ...(adjustedContextMenu?.subMenuUp
                        ? { bottom: 0, top: 'auto' }
                        : { top: 0, bottom: 'auto' }),
                    }}
                  >
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-theme-muted border-b border-glass mb-1">
                      Read By
                    </div>
                    <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {liveContextMenuMsg.readBy &&
                      liveContextMenuMsg.readBy.length > 0 ? (
                        liveContextMenuMsg.readBy.map((reader) => (
                          <div
                            key={reader.userId}
                            className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-md text-[12px] font-medium text-theme-primary"
                          >
                            <span className="truncate flex-1">
                              {reader.name}
                            </span>
                            {reader.readAt && (
                              <span className="text-[10.5px] text-theme-muted shrink-0">
                                {formatReadAtTimestamp(reader.readAt)}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center px-3 py-1.5 rounded-md text-[12px] font-medium text-theme-muted italic break-all">
                          <span className="whitespace-nowrap overflow-hidden text-ellipsis w-full">
                            No one yet
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>,
          document.body,
        )}

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
      {activeMediaItem && (
        <div
          className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md transition-all duration-300 animate-fade-in animate-duration-150"
          onClick={() => setActiveMediaItem(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[80vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/25 text-white rounded-full p-2 hover:scale-105 active:scale-95 transition-all border-none cursor-pointer flex items-center justify-center shadow-lg"
              onClick={() => setActiveMediaItem(null)}
              title="Close viewer"
            >
              <IconX size={20} />
            </button>

            {/* Media rendering */}
            {activeMediaItem.type.startsWith('image/') ? (
              <img
                src={activeMediaItem.url}
                alt={activeMediaItem.name}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl border border-white/10"
              />
            ) : activeMediaItem.type.startsWith('video/') ? (
              <video
                src={activeMediaItem.url}
                controls
                autoPlay
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl border border-white/10"
              />
            ) : null}

            {/* Title / details */}
            <div className="mt-4 text-center text-white px-4 max-w-lg">
              <h4 className="text-[15px] font-bold truncate">
                {activeMediaItem.name}
              </h4>
              <p className="text-[12px] text-white/60 mt-1">
                {(activeMediaItem.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>
      )}

      {profileCardUserId && (
        <div
          className="fixed inset-0 z-9998 bg-transparent cursor-default"
          onClick={() => {
            setProfileCardUserId(null);
            setProfilePopoverPosition(null);
          }}
        />
      )}
      {profileCardUserId && profilePopoverPosition && (
        <MemberProfilePopover
          selectedMember={getMemberDetailsForPopover(profileCardUserId)}
          popoverPosition={profilePopoverPosition}
          onClose={() => {
            setProfileCardUserId(null);
            setProfilePopoverPosition(null);
          }}
          groupId={activeGroup?.id}
        />
      )}
      {/* Reaction picker — single centered modal shared across all messages */}
      {activeReactionMessageId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={() => setActiveReactionMessageId(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-10 shadow-(--glass-shadow) rounded-2xl overflow-hidden border-[1.5px] border-glass bg-(--glass-bg) backdrop-blur-[20px] animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveReactionMessageId(null)}
              className="absolute top-2 right-2 z-20 w-7 h-7 rounded-lg flex items-center justify-center bg-(--glass-bg) border border-glass text-theme-muted hover:text-theme-primary hover:bg-(--theme-btn-hover) transition-all duration-150"
              title="Close"
            >
              <IconX size={14} />
            </button>
            <EmojiPicker
              onEmojiSelect={(emoji: any) => {
                if (activeConversationId && activeReactionMessageId) {
                  socketManager.toggleReaction(
                    activeReactionMessageId,
                    activeConversationId,
                    emoji.native,
                  );
                }
                setActiveReactionMessageId(null);
              }}
              theme="auto"
              previewPosition="none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
