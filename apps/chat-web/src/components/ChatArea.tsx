import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
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
import { ConfirmationModal } from './ConfirmationModal';
import { FriendsDashboard } from './FriendsDashboard';
import { IconChat } from './Icons';
import { showToast } from './toast';
import type { Message, MessageMediaItem } from '../store/slices/chatSlice';

import {
  searchEmojis,
  calculatePopoverPosition,
  getMemberDetailsHelper,
  ChatHeader,
  WelcomeHub,
  ChatInputArea,
  MessageBubbleRow,
  MessageCompactRow,
  MessageContextMenu,
  CodeViewerModal,
  MediaViewerModal,
  ReactionPickerModal,
  MobileEmojiPickerModal,
  MemberProfilePopoverModal,
} from './chat';

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

export function ChatArea({
  activeConversationId,
  setIsComposeOpen,
  isChannelMode = false,
  activeChannelName = null,
  isMembersListOpen = false,
  onToggleMembersList,
  onMenuClick,
  isMobileView = false,
}: ChatAreaProps): React.JSX.Element {
  const dispatch = useAppDispatch();
  const feedEndRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const mobileEmojiContainerRef = useRef<HTMLDivElement>(null);

  const { user, timeFormat } = useAppSelector((s) => s.auth);

  // Live greeting and clock
  const [timeStr, setTimeStr] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: timeFormat === '24h' ? '2-digit' : 'numeric',
          minute: '2-digit',
          hour12: timeFormat !== '24h',
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
  }, [timeFormat]);

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

  // Local state
  const [messageInput, setMessageInput] = useState('');
  const [isMdMode, setIsMdMode] = useState(false);
  const [mdTab, setMdTab] = useState<'write' | 'preview'>('write');
  const [isTypingState, setIsTypingState] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [viewingCode, setViewingCode] = useState<{
    code: string;
    language: string;
  } | null>(null);

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
  const isMobile = isMobileScreen || isMobileView;

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

  const getMemberDetailsForPopover = (userId: string) =>
    getMemberDetailsHelper(
      userId,
      user,
      userProfiles,
      activeGroup,
      onlineUsers,
      friends,
    );

  const handleOpenProfile = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = calculatePopoverPosition(rect);

    setProfilePopoverPosition(position);
    setProfileCardUserId(userId);
    if (userId !== user?.id && !userProfiles[userId]) {
      dispatch(fetchUserProfile(userId));
    }
  };

  const getReactingUserNames = (userIds: string[]) => {
    if (!userIds || userIds.length === 0) {
      return [];
    }
    return userIds.map((uid) => {
      if (uid === user?.id) {
        return 'You';
      }
      const cached = userProfiles[uid];
      if (cached?.username) {
        return `@${cached.username}`;
      }
      if (cached?.displayName) {
        return cached.displayName;
      }
      const member = activeGroup?.members?.find((m) => m.userId === uid);
      if (member?.user?.username) {
        return `@${member.user.username}`;
      }
      if (member?.user?.displayName) {
        return member.user.displayName;
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
    const emojiChar = emoji.native;
    const inputEl = document.getElementById(
      'message-input',
    ) as HTMLTextAreaElement | null;
    if (inputEl) {
      const start = inputEl.selectionStart ?? messageInput.length;
      const end = inputEl.selectionEnd ?? messageInput.length;
      const before = messageInput.substring(0, start);
      const after = messageInput.substring(end);
      setMessageInput(before + emojiChar + after);
      setTimeout(() => {
        inputEl.focus();
        inputEl.setSelectionRange(
          start + emojiChar.length,
          start + emojiChar.length,
        );
      }, 0);
    } else {
      setMessageInput((prev) => prev + emojiChar);
    }
    setShowEmojiPicker(false);
  };

  const [activeMediaItem, setActiveMediaItem] =
    useState<MessageMediaItem | null>(null);
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
    }
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
  const [adjustedContextMenu, setAdjustedContextMenu] = useState<{
    x: number;
    y: number;
    subMenuLeft: boolean;
    subMenuUp: boolean;
  } | null>(null);

  // Pagination & Scroll UX state
  const isFetchingMoreRef = useRef(false);
  const scrollHeightBeforeLoadRef = useRef(0);
  const scrollTopBeforeLoadRef = useRef(0);
  const prevActiveConvoIdRef = useRef<string | null>(null);
  const prevMessagesLengthRef = useRef(0);
  const isFirstRenderForConvoRef = useRef(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Messages on conversation change
  useEffect(() => {
    setMessageInput('');
    setIsMdMode(false);
    setMdTab('write');
    setIsTypingState(false);
    setShowEmojiPicker(false);
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

  // Scroll & Anchor Management
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
        const newScrollHeight = container.scrollHeight;
        const oldScrollHeight = scrollHeightBeforeLoadRef.current;
        const oldScrollTop = scrollTopBeforeLoadRef.current;

        container.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
        isFetchingMoreRef.current = false;
        setIsFetchingMore(false);
      } else if (isFirstRenderForConvoRef.current) {
        container.scrollTop = container.scrollHeight;
        isFirstRenderForConvoRef.current = false;
      } else {
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
      prevMessagesLengthRef.current = messagesLength;
    }
  }, [activeMessages, activeConversationId, user?.id]);

  // Infinite scroll
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

  // Resolve sender profiles and reaction user profiles
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

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (messageInput.trim().toLowerCase() === '/md') {
      setIsMdMode(true);
      setMessageInput('');
      return;
    }
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

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    let val = e.target.value;
    const lowerVal = val.toLowerCase();
    if (lowerVal.startsWith('/md ') || lowerVal.startsWith('/md\n')) {
      setIsMdMode(true);
      val = val.slice(4);
    } else if (
      lowerVal.trim() === '/md' &&
      (val.endsWith(' ') || val.endsWith('\n'))
    ) {
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

  // Delete conversation
  const handleDeleteConversation = () => {
    if (!activeConversationId) {
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
        dispatch(deleteConversation(activeConversationId));
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
    if (isMobile) {
      return;
    }
    setContextMenu({ message: msg, x: e.clientX, y: e.clientY });
  };

  const handleLongPress = (coords: { x: number; y: number }, msg: Message) => {
    if (!isMobile) {
      return;
    }
    setContextMenu({ message: msg, x: coords.x, y: coords.y });
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

      if (contextMenu.x + rect.width > viewportWidth) {
        adjustX = viewportWidth - rect.width - 16;
      }
      if (adjustX < 16) {
        adjustX = 16;
      }

      if (contextMenu.y + rect.height > viewportHeight) {
        adjustY = viewportHeight - rect.height - 16;
      }
      if (adjustY < 16) {
        adjustY = 16;
      }

      const subMenuLeft = adjustX + rect.width + 160 + 16 > viewportWidth;
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

  // Conversation details helper
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

    return { name: 'Direct Message', letter: 'D', email: '', id: undefined };
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

  return (
    <div
      className={`glass-panel flex flex-col overflow-hidden h-full flex-1 min-w-0 ${
        isMobileView ? 'rounded-none' : ''
      }`}
    >
      {activeConversationId && (activeDetails || isChannelMode) ? (
        <>
          {/* Header component */}
          <ChatHeader
            isMobileView={isMobileView}
            isMobileScreen={isMobileScreen}
            isChannelMode={isChannelMode}
            isVoiceChannel={isVoiceChannel}
            activeChannelName={activeChannelName}
            activeDetails={activeDetails}
            activeStatus={activeStatus}
            isActiveTyping={isActiveTyping}
            typingText={getTypingText()}
            activeConvo={activeConvo}
            onMenuClick={onMenuClick}
            onOpenProfile={handleOpenProfile}
            onStartCall={handleStartCall}
            onDeleteConversation={handleDeleteConversation}
            isMembersListOpen={isMembersListOpen}
            onToggleMembersList={onToggleMembersList}
          />

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
                className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-3.5 bg-theme-chat ${
                  isMobileScreen || isMobileView ? 'p-3' : 'p-5'
                }`}
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
                    const rowProps = {
                      msg,
                      user,
                      userProfiles,
                      onlineUsers,
                      isChannelMode,
                      activeGroup,
                      timeFormat,
                      editingMessageId,
                      setEditingMessageId,
                      editingContent,
                      setEditingContent,
                      handleSaveEdit,
                      handleStartEdit,
                      handleDeleteMessage,
                      setReplyingToMessage,
                      setActiveReactionMessageId,
                      activeReactionMessageId,
                      setActiveMediaItem,
                      handleContextMenu,
                      handleLongPress,
                      handleOpenProfile,
                      canDeleteOthers,
                      activeConversationId,
                      findUserByName,
                      onViewCode: setViewingCode,
                      isMobileScreen,
                      isMobileView,
                      getReactingUserNames,
                    };

                    return isBubbleLayout ? (
                      <MessageBubbleRow key={msg.id} {...rowProps} />
                    ) : (
                      <MessageCompactRow key={msg.id} {...rowProps} />
                    );
                  })
                )}

                {/* Typing indicator */}
                {isActiveTyping && (
                  <div className="self-start flex items-center gap-2 px-4 py-2.5 rounded-[18px] animate-fade-in msg-bubble-in text-[13px] text-theme-secondary shadow-xs">
                    {isChannelMode ? (
                      <>
                        <span className="font-semibold text-theme-primary">
                          {getTypingText()}
                        </span>
                        <div className="flex items-center gap-1 ml-1">
                          <span
                            className="typing-dot"
                            style={{ animationDelay: '0ms' }}
                          />
                          <span
                            className="typing-dot"
                            style={{ animationDelay: '200ms' }}
                          />
                          <span
                            className="typing-dot"
                            style={{ animationDelay: '400ms' }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 py-0.5">
                        <span
                          className="typing-dot"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="typing-dot"
                          style={{ animationDelay: '200ms' }}
                        />
                        <span
                          className="typing-dot"
                          style={{ animationDelay: '400ms' }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div ref={feedEndRef} className="h-px shrink-0" />
              </div>

              {/* Chat Input Area */}
              <ChatInputArea
                replyingToMessage={replyingToMessage}
                onCancelReply={() => setReplyingToMessage(null)}
                attachedFiles={attachedFiles}
                onRemoveAttachment={(file) => {
                  deleteUploadedFile(file.url);
                  if (file.thumbnailUrl) {
                    deleteUploadedFile(file.thumbnailUrl);
                  }
                  setAttachedFiles((prev) =>
                    prev.filter((f) => f.url !== file.url),
                  );
                }}
                canSendMessages={canSendMessages}
                canAttachFiles={canAttachFiles}
                isChannelMode={isChannelMode}
                activeChannel={activeChannel}
                hasChannelWriteAccess={hasChannelWriteAccess}
                uploading={uploading}
                messageInput={messageInput}
                onInputChange={handleInputChange}
                onSendMessage={handleSendMessage}
                isMobile={isMobile}
                isMobileScreen={isMobileScreen}
                isMdMode={isMdMode}
                setIsMdMode={setIsMdMode}
                mdTab={mdTab}
                setMdTab={setMdTab}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                onEmojiSelect={onEmojiSelect}
                processFiles={processFiles}
                matchingMentions={matchingMentions}
                activeSuggestIndex={activeSuggestIndex}
                setActiveSuggestIndex={setActiveSuggestIndex}
                atMentionQuery={atMentionQuery}
                setAtMentionQuery={setAtMentionQuery}
                mentionQuery={mentionQuery}
                setMentionQuery={setMentionQuery}
                emojiResults={emojiResults}
                setEmojiResults={setEmojiResults}
                setMessageInput={setMessageInput}
                userProfiles={userProfiles}
                currentUser={user}
                activeGroup={activeGroup}
              />
            </>
          )}
        </>
      ) : (
        /* Empty State / Welcome Hub */
        <WelcomeHub
          timeStr={timeStr}
          greeting={greeting}
          user={user}
          onNewMessage={() => setIsComposeOpen(true)}
          onOpenFriends={() => dispatch(setActiveConversation('friends'))}
        />
      )}

      {/* Message Context Menu Portal */}
      <MessageContextMenu
        contextMenu={contextMenu}
        adjustedContextMenu={adjustedContextMenu}
        contextMenuRef={contextMenuRef}
        currentUser={user}
        canDeleteOthers={canDeleteOthers}
        isChannelMode={isChannelMode}
        timeFormat={timeFormat}
        onStartEdit={handleStartEdit}
        onDeleteMessage={handleDeleteMessage}
        onReply={(msg) => setReplyingToMessage(msg)}
        onClose={() => setContextMenu(null)}
        onSelectReaction={(msgId, emoji) => {
          if (activeConversationId) {
            socketManager.toggleReaction(msgId, activeConversationId, emoji);
          }
        }}
        onOpenReactionPicker={(msgId) => {
          setActiveReactionMessageId(msgId);
        }}
      />

      {/* Confirmation Modal */}
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

      {/* Code Viewer Modal */}
      <CodeViewerModal
        viewingCode={viewingCode}
        onClose={() => setViewingCode(null)}
      />

      {/* Media Lightbox Modal */}
      <MediaViewerModal
        activeMediaItem={activeMediaItem}
        onClose={() => setActiveMediaItem(null)}
      />

      {/* Member Profile Popover Modal */}
      <MemberProfilePopoverModal
        userId={profileCardUserId}
        popoverPosition={profilePopoverPosition}
        selectedMember={
          profileCardUserId
            ? getMemberDetailsForPopover(profileCardUserId)
            : null
        }
        groupId={activeGroup?.id}
        onClose={() => {
          setProfileCardUserId(null);
          setProfilePopoverPosition(null);
        }}
      />

      {/* Centered Reaction Picker Modal */}
      <ReactionPickerModal
        activeReactionMessageId={activeReactionMessageId}
        onClose={() => setActiveReactionMessageId(null)}
        userId={user?.id}
        onSelectReaction={(emojiNative) => {
          if (activeConversationId && activeReactionMessageId) {
            socketManager.toggleReaction(
              activeReactionMessageId,
              activeConversationId,
              emojiNative,
            );
          }
        }}
      />

      {/* Mobile Input Emoji Picker Overlay */}
      <MobileEmojiPickerModal
        isOpen={showEmojiPicker && isMobile}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={onEmojiSelect}
        mobileEmojiContainerRef={mobileEmojiContainerRef}
      />
    </div>
  );
}

export default ChatArea;
