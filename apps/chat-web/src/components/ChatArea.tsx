import type { PresenceStatus } from '@chat-app/shared-constants';
import { PRESENCE_DOT_COLORS, STATUS_TEXTS } from '@chat-app/shared-constants';
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
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
      <div className="p-4 text-center text-[13px] text-[var(--text-muted)] w-[352px] h-[435px] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-[var(--accent-primary)]" />
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
} from '../store/slices/chatSlice';
import { socketManager } from '../store/socketManager';

import { Avatar } from './Avatar';
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
} from './Icons';
import { PresenceDot } from './PresenceDot';
import { showToast } from './toast';
import type { Message } from '../store/slices/chatSlice';

interface ChatAreaProps {
  activeConversationId: string | null;
  setIsComposeOpen: (open: boolean) => void;
  isChannelMode?: boolean;
  activeChannelName?: string | null;
  isMembersListOpen?: boolean;
  onToggleMembersList?: () => void;
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

const renderMessageMedia = (msg: Message) => {
  if (!msg.mediaUrl) {
    return null;
  }
  const isImage = msg.mediaType?.startsWith('image/');
  const isVideo = msg.mediaType?.startsWith('video/');

  if (isImage) {
    return (
      <div className="mt-1.5 max-w-sm rounded-lg overflow-hidden border border-[var(--border-muted)] bg-[var(--bg-input)]">
        <img
          src={msg.mediaUrl}
          alt={msg.mediaName || 'Image'}
          className="w-full max-h-60 object-cover cursor-pointer hover:opacity-90"
          onClick={() => window.open(msg.mediaUrl, '_blank')}
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-1.5 max-w-sm rounded-lg overflow-hidden border border-[var(--border-muted)] bg-[var(--bg-input)]">
        <video
          src={msg.mediaUrl}
          controls
          className="w-full max-h-60 object-cover"
        />
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex items-center gap-3 p-3 rounded-lg border border-[var(--border-muted)] bg-[var(--bg-input)] max-w-sm text-[13px] text-left">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--accent-primary)] text-white text-[16px] shrink-0">
        📁
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="font-semibold truncate text-[var(--text-primary)] text-[13.5px]">
          {msg.mediaName || 'Attachment'}
        </div>
        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
          {msg.mediaSize
            ? `${(msg.mediaSize / 1024).toFixed(1)} KB`
            : 'Unknown size'}
        </div>
      </div>
      <a
        href={msg.mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded-lg bg-[var(--theme-btn)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--theme-btn-hover)] shrink-0 flex items-center justify-center active-press"
        title="Download file"
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
};

export const ChatArea = ({
  activeConversationId,
  setIsComposeOpen,
  isChannelMode = false,
  activeChannelName = null,
  isMembersListOpen = false,
  onToggleMembersList,
}: ChatAreaProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const feedEndRef = useRef<HTMLDivElement>(null);

  const { user } = useAppSelector((s) => s.auth);
  const {
    conversations,
    messages,
    typingUsers,
    onlineUsers,
    userProfiles,
    convoRecipients,
    hasMoreMessages,
  } = useAppSelector((s) => s.chat);

  // --- Local state ---
  const [messageInput, setMessageInput] = useState('');
  const [isTypingState, setIsTypingState] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const [mentionQuery, setMentionQuery] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const [emojiResults, setEmojiResults] = useState<any[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const onEmojiSelect = (emoji: any) => {
    setMessageInput((prev) => prev + emoji.native);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{
    url: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast.error('File size cannot exceed 20MB.');
      return;
    }

    setUploading(true);

    if (attachedFile) {
      await deleteUploadedFile(attachedFile.url);
    }

    const formData = new FormData();
    formData.append('bucket', 'relayflow');
    formData.append('folder', 'chat-medis');
    formData.append('files', file);

    try {
      const bucketUrl = (
        process.env.NEXT_PUBLIC_BUCKET_URL || 'https://bucket.umangsailor.com'
      ).replace(/\/+$/, '');
      const response = await fetch(`${bucketUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        const uploaded = data.files[0];
        setAttachedFile({
          url: uploaded.url,
          name: uploaded.originalName || file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
        });
      } else {
        throw new Error('No files returned');
      }
    } catch (err) {
      console.error('File upload error:', err);
      showToast.error('Failed to upload file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  // --- Pagination & Scroll UX state ---
  const isFetchingMoreRef = useRef(false);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const scrollHeightBeforeLoadRef = useRef(0);
  const scrollTopBeforeLoadRef = useRef(0);
  const prevActiveConvoIdRef = useRef<string | null>(null);
  const prevMessagesLengthRef = useRef(0);
  const isFirstRenderForConvoRef = useRef(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ---- Messages on conversation change ----
  useEffect(() => {
    setMessageInput('');
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

  // ---- Resolve sender profiles ----
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
      });
    }
  }, [activeConversationId, messages, userProfiles, user, dispatch]);

  // ---- Messages ----
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && !attachedFile) || !activeConversationId) {
      return;
    }

    const media = attachedFile
      ? {
          mediaUrl: attachedFile.url,
          mediaType: attachedFile.type,
          mediaName: attachedFile.name,
          mediaSize: attachedFile.size,
        }
      : undefined;

    socketManager.sendMessage(activeConversationId, messageInput.trim(), media);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketManager.stopTyping(activeConversationId);
    setIsTypingState(false);
    setMessageInput('');
    setAttachedFile(null);
    setShowEmojiPicker(false);
  };

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const val = e.target.value;
    setMessageInput(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/:([a-zA-Z0-9_-]{2,})$/);
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
        name: r.username
          ? `@${r.username}`
          : r.displayName || r.email.split('@')[0],
        letter: (r.username || r.displayName || r.email)[0].toUpperCase(),
        email: r.email,
        id: r.id,
        avatarUrl: r.avatarUrl,
      };
    }

    return { name: 'Direct Message', letter: 'D', email: '', id: null };
  };

  if (!user) {
    return <div className="flex-1" />;
  }

  if (activeConversationId === 'friends') {
    return <FriendsDashboard />;
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

  return (
    <div className="glass-panel flex flex-col overflow-hidden h-full flex-1 min-w-0">
      {activeConversationId && (activeDetails || isChannelMode) ? (
        <>
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border-muted)] bg-[var(--bg-sidebar)] rounded-t-2xl">
            {isChannelMode ? (
              /* Channel mode header */
              <div className="flex-1 min-w-0 flex items-center gap-2.5">
                <span className="text-[var(--text-muted)] flex shrink-0">
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
                </span>
                <h3 className="text-[16px] font-bold tracking-tight truncate text-[var(--text-primary)]">
                  {activeChannelName || activeDetails?.name || ''}
                </h3>
                {isActiveTyping && (
                  <span className="text-[11.5px] font-medium ml-2 animate-pulse text-[var(--accent-primary)]">
                    {getTypingText()}…
                  </span>
                )}
              </div>
            ) : (
              <>
                <Avatar
                  letter={activeDetails?.letter || ''}
                  url={activeDetails?.avatarUrl}
                  status={activeStatus}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-bold tracking-tight truncate text-[var(--text-primary)]">
                    {activeDetails?.name || ''}
                  </h3>
                  {isActiveTyping ? (
                    <span className="text-[11.5px] font-medium text-[var(--accent-primary)]">
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
              </>
            )}
            {/* Delete thread — only in DM mode */}
            {!isChannelMode && (
              <button
                id="delete-thread-btn"
                title="Delete thread"
                className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-all duration-200 shrink-0 border-[1.5px] bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)] hover:bg-[var(--danger)] hover:text-white hover:border-[var(--danger)] hover:shadow-[0_4px_14px_rgba(239,68,68,0.3)] active-press"
                onClick={() => handleDeleteConversation(activeConversationId)}
              >
                <IconTrash />
                Delete
              </button>
            )}

            {/* Members Toggle Button — only in Channel mode */}
            {isChannelMode && onToggleMembersList && (
              <button
                id="toggle-members-btn"
                title="Toggle Member List"
                onClick={onToggleMembersList}
                className={`bg-transparent border-none cursor-pointer p-1.5 rounded-[6px] flex items-center transition-all duration-150 active-press 
                  ${isMembersListOpen ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]'}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-[18px] h-[18px]"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
            )}
          </div>

          {/* Message Feed */}
          <div
            ref={feedContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto flex flex-col gap-3.5 p-5 bg-[var(--bg-chat)]"
          >
            {isFetchingMore && (
              <div className="flex justify-center py-2 shrink-0">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-[var(--accent-primary)]" />
              </div>
            )}
            {activeMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-[13.5px] text-[var(--text-muted)]">
                <IconChat />
                <span>No messages yet. Send a greeting to begin.</span>
              </div>
            ) : (
              activeMessages.map((msg) => {
                const isOut = msg.senderId === user.id;
                const senderProfile = userProfiles[msg.senderId];
                const senderName = isOut
                  ? user.username
                    ? `@${user.username}`
                    : user.displayName || user.email.split('@')[0]
                  : senderProfile?.username
                    ? `@${senderProfile.username}`
                    : senderProfile?.displayName ||
                      senderProfile?.email?.split('@')[0] ||
                      'User';

                if (isChannelMode) {
                  const letter =
                    (senderName.startsWith('@')
                      ? senderName.slice(1)
                      : senderName)[0]?.toUpperCase() || 'U';
                  const presenceStatus = isOut
                    ? onlineUsers[user.id] || user.status || 'online'
                    : onlineUsers[msg.senderId] || 'offline';
                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 animate-fade-in group justify-between hover:bg-[rgba(0,0,0,0.015)] dark:hover:bg-[rgba(255,255,255,0.01)] rounded-xl px-2 py-1.5 transition-colors duration-150 -mx-2"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar
                          letter={letter}
                          url={
                            isOut ? user.avatarUrl : senderProfile?.avatarUrl
                          }
                          status={presenceStatus}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span
                              className={`text-[13.5px] font-bold ${isOut ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}
                            >
                              {senderName}
                            </span>
                            <span className="text-[10.5px] text-[var(--text-muted)]">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {msg.content && (
                            <div
                              className={`text-sm leading-relaxed text-[var(--text-primary)] break-all ${isOnlyEmojis(msg.content) ? 'text-[60px] leading-[60px]' : ''}`}
                            >
                              {msg.content}
                            </div>
                          )}
                          {renderMessageMedia(msg)}
                        </div>
                      </div>
                      {isOut && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="msg-delete-btn flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-[var(--danger-bg)] text-[var(--danger)] mt-0.5 active-press"
                          title="Delete message"
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-center gap-2 group max-w-[68%] animate-fade-in ${isOut ? 'self-end' : 'self-start'}`}
                  >
                    {isOut && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="msg-delete-btn flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-[var(--danger-bg)] text-[var(--danger)] shrink-0 active-press"
                        title="Delete message"
                      >
                        <IconTrash />
                      </button>
                    )}
                    <div
                      className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} min-w-0 flex-1`}
                    >
                      {msg.content && (
                        <div
                          className={
                            isOnlyEmojis(msg.content)
                              ? `text-[60px] leading-[60px] break-words select-all ${isOut ? 'text-right' : 'text-left'}`
                              : `px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed break-words ${isOut ? 'msg-bubble-out' : 'msg-bubble-in'}`
                          }
                        >
                          {msg.content}
                        </div>
                      )}
                      {renderMessageMedia(msg)}
                      <div className="flex items-center gap-1 mt-1 px-1 select-none">
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isOut && (
                          <span
                            className={`inline-flex items-center ${msg.isRead ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}
                            title={msg.isRead ? 'Read' : 'Sent'}
                          >
                            {msg.isRead ? <IconDoubleCheck /> : <IconCheck />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {isActiveTyping && (
              <div className="self-start flex items-center gap-2 px-4 py-2.5 rounded-[18px] animate-fade-in msg-bubble-in text-[13px] text-[var(--text-secondary)]">
                {isChannelMode ? (
                  <>
                    <span className="font-semibold text-[var(--text-primary)]">
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
          <div className="px-4 py-3.5 border-t border-[var(--border-muted)] bg-[var(--bg-sidebar)] rounded-b-2xl">
            {attachedFile && (
              <div className="flex items-center gap-3 p-2 mb-2 rounded-xl border border-[var(--border-muted)] bg-[var(--bg-input)] animate-fade-in text-[13px] relative max-w-md">
                {attachedFile.type.startsWith('image/') ? (
                  <img
                    src={attachedFile.url}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-lg shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[var(--accent-primary)] text-white text-[20px] shrink-0">
                    📄
                  </div>
                )}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="font-semibold truncate text-[var(--text-primary)] text-[13.5px]">
                    {attachedFile.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {(attachedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    deleteUploadedFile(attachedFile.url);
                    setAttachedFile(null);
                  }}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-[var(--danger-bg)] text-[var(--danger)] border-none cursor-pointer hover:bg-[var(--danger)] hover:text-white transition-all duration-150 active-press"
                  title="Remove attachment"
                >
                  <IconX size={10} />
                </button>
              </div>
            )}
            <form
              className="flex gap-2.5 items-end"
              onSubmit={handleSendMessage}
            >
              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="w-[46px] h-[46px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 bg-[var(--bg-input)] text-[var(--text-muted)] hover:bg-[var(--theme-btn-hover)] hover:text-[var(--text-primary)] active-press"
                  title="Choose an emoji"
                >
                  <IconEmoji size={20} />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-[56px] left-0 z-50 shadow-[var(--glass-shadow)] rounded-[14px] overflow-hidden border border-[var(--border-muted)] bg-[var(--bg-sidebar)]">
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
                disabled={uploading}
                className="w-[46px] h-[46px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 bg-[var(--bg-input)] text-[var(--text-muted)] hover:bg-[var(--theme-btn-hover)] hover:text-[var(--text-primary)] active-press"
                title="Attach a file"
              >
                {uploading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-[var(--text-primary)]" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-[18px] h-[18px]"
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
              />
              <div className="relative flex-1">
                {mentionQuery && emojiResults.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 w-[300px] max-h-[200px] overflow-y-auto bg-[var(--bg-sidebar)] border border-[var(--border-muted)] rounded-xl shadow-[var(--glass-shadow)] z-50 flex flex-col p-1">
                    {emojiResults.map((emoji: any) => (
                      <button
                        key={emoji.id}
                        type="button"
                        className="flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-input)] active-press cursor-pointer border-none bg-transparent"
                        onClick={() => {
                          const val = messageInput;
                          const newText =
                            val.slice(0, mentionQuery.start) +
                            emoji.skins[0].native +
                            val.slice(mentionQuery.end);
                          setMessageInput(newText);
                          setMentionQuery(null);
                          setEmojiResults([]);
                          document.getElementById('message-input')?.focus();
                        }}
                      >
                        <span className="text-[20px] leading-none">
                          {emoji.skins[0].native}
                        </span>
                        <span className="text-[13px] text-[var(--text-primary)]">
                          :{emoji.id}:
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  id="message-input"
                  className="input-base w-full rounded-xl px-4 py-2.5 text-[14px] resize-none leading-relaxed min-h-7.5 max-h-30 bg-theme-input border-[1.5px] border-glass text-theme-primary focus:outline-none focus:border-(--accent-primary) focus:ring-[3px] focus:ring-[var(--accent-ring)]"
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
              </div>
              <button
                id="send-message-btn"
                type="submit"
                disabled={!messageInput.trim() && !attachedFile}
                className="btn-send w-[46px] h-[46px] rounded-xl flex-shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)] active-press"
              >
                <IconSend />
              </button>
            </form>
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[var(--bg-chat)] rounded-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full flex items-center justify-center animate-float border bg-[var(--theme-btn-active)] border-[var(--accent-primary)]">
            <IconChat />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--text-primary)]">
            RelayFlow Workspace
          </h2>
          <p className="text-[13.5px] max-w-[290px] text-center leading-relaxed text-[var(--text-secondary)]">
            Select a conversation from the sidebar or search for a contact to
            start messaging.
          </p>
          <button
            id="empty-compose-btn"
            className="mt-1 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white cursor-pointer transition-all duration-200 border-none btn-send hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)] active-press"
            onClick={() => setIsComposeOpen(true)}
          >
            Start a conversation
          </button>
        </div>
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
    </div>
  );
};
