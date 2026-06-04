import type { PresenceStatus } from '@chat-app/shared-constants';
import { PRESENCE_DOT_COLORS, STATUS_TEXTS } from '@chat-app/shared-constants';
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
} from '../store/slices/chatSlice';
import { socketManager } from '../store/socketManager';

import { Avatar } from './Avatar';
import {
  IconSend,
  IconTrash,
  IconChat,
  IconCheck,
  IconDoubleCheck,
} from './Icons';
import { PresenceDot } from './PresenceDot';

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
    if (activeConversationId) {
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
    if (activeConversationId) {
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
    if (!activeConversationId || !typingUsers[activeConversationId] || !user) {
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
  const activeMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];

  useEffect(() => {
    isFirstRenderForConvoRef.current = true;
  }, [activeConversationId]);

  useLayoutEffect(() => {
    const container = feedContainerRef.current;
    if (!container || !activeConversationId) {
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
    if (activeConversationId && messages[activeConversationId]) {
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
    if (!messageInput.trim() || !activeConversationId) {
      return;
    }
    socketManager.sendMessage(activeConversationId, messageInput.trim());
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketManager.stopTyping(activeConversationId);
    setIsTypingState(false);
    setMessageInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
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
    if (window.confirm('Remove this thread and all messages?')) {
      dispatch(deleteConversation(convoId));
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!activeConversationId) {
      return;
    }
    if (window.confirm('Are you sure you want to delete this message?')) {
      socketManager.deleteMessage(messageId, activeConversationId);
    }
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
        name: r.displayName || r.email.split('@')[0],
        letter: (r.displayName || r.email)[0].toUpperCase(),
        email: r.email,
        id: r.id,
      };
    }

    return { name: 'Direct Message', letter: 'D', email: '', id: null };
  };

  if (!user) {
    return <div className="flex-1" />;
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
            return (
              profile?.displayName || profile?.email?.split('@')[0] || 'Someone'
            );
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
                className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-all duration-200 shrink-0 border-[1.5px] bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger-border)] hover:bg-[var(--danger)] hover:text-white hover:border-[var(--danger)] hover:shadow-[0_4px_14px_rgba(239,68,68,0.3)]"
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
                className={`bg-transparent border-none cursor-pointer p-1.5 rounded-[6px] flex items-center transition-all duration-150 
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
                  ? user.displayName || user.email.split('@')[0]
                  : senderProfile?.displayName ||
                    senderProfile?.email?.split('@')[0] ||
                    'User';

                if (isChannelMode) {
                  return (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 animate-fade-in group justify-between"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 border-[var(--glass-border)] ${isOut ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-input)] text-[var(--text-primary)]'}`}
                        >
                          {senderName[0]?.toUpperCase()}
                        </div>
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
                          <div
                            className={`text-sm leading-relaxed text-[var(--text-primary)] break-all ${isOnlyEmojis(msg.content) ? 'text-[60px] leading-[60px]' : ''}`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                      {isOut && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="msg-delete-btn flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-[var(--danger-bg)] text-[var(--danger)] mt-0.5"
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
                    className={`flex items-center gap-2 group max-w-[68%] ${isOut ? 'self-end' : 'self-start'}`}
                  >
                    {isOut && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="msg-delete-btn flex items-center justify-center p-1.5 rounded-lg border-none cursor-pointer bg-[var(--danger-bg)] text-[var(--danger)] shrink-0"
                        title="Delete message"
                      >
                        <IconTrash />
                      </button>
                    )}
                    <div
                      className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} min-w-0 flex-1`}
                    >
                      <div
                        className={
                          isOnlyEmojis(msg.content)
                            ? `text-[60px] leading-[60px] break-words select-all ${isOut ? 'text-right' : 'text-left'}`
                            : `px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed break-words ${isOut ? 'msg-bubble-out' : 'msg-bubble-in'}`
                        }
                      >
                        {msg.content}
                      </div>
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
            <form
              className="flex gap-2.5 items-end"
              onSubmit={handleSendMessage}
            >
              <textarea
                id="message-input"
                className="input-base flex-1 rounded-xl px-4 py-3 text-[14px] resize-none leading-relaxed min-h-[46px] max-h-[120px] bg-[var(--bg-input)] border-[1.5px] border-[var(--glass-border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-ring)]"
                placeholder="Type a message… (Enter to send)"
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <button
                id="send-message-btn"
                type="submit"
                disabled={!messageInput.trim()}
                className="btn-send w-[46px] h-[46px] rounded-xl flex-shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)]"
              >
                <IconSend />
              </button>
            </form>
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[var(--bg-chat)] rounded-2xl">
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
            className="mt-1 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white cursor-pointer transition-all duration-200 border-none btn-send hover:-translate-y-0.5 hover:shadow-[var(--btn-shadow)]"
            onClick={() => setIsComposeOpen(true)}
          >
            Start a conversation
          </button>
        </div>
      )}
    </div>
  );
};
