import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchMessages,
  deleteConversation,
  fetchUserProfile,
} from '../store/slices/chatSlice';
import { socketManager } from '../store/socketManager';
import { Avatar } from './Avatar';
import { PresenceDot } from './PresenceDot';
import { PresenceStatus, PRESENCE_DOT_COLORS, STATUS_TEXTS } from '@chat-app/shared-constants';
import { IconSend, IconTrash, IconChat } from './Icons';

interface ChatAreaProps {
  activeConversationId: string | null;
  setIsComposeOpen: (open: boolean) => void;
  isChannelMode?: boolean;
  activeChannelName?: string | null;
  isMembersListOpen?: boolean;
  onToggleMembersList?: () => void;
}

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
      dispatch(fetchMessages({ conversationId: activeConversationId, limit: 20, offset: 0 }));
      socketManager.joinConversation(activeConversationId);
    }
  }, [activeConversationId, dispatch]);

  useEffect(() => {
    if (activeConversationId) {
      const recipientId = convoRecipients[activeConversationId];
      if (recipientId && user && recipientId !== user.id && !userProfiles[recipientId]) {
        dispatch(fetchUserProfile(recipientId));
      }
    }
  }, [activeConversationId, convoRecipients, userProfiles, user, dispatch]);

  // ---- Scroll & Anchor Management ----
  const activeMessages = activeConversationId ? (messages[activeConversationId] || []) : [];

  useEffect(() => {
    isFirstRenderForConvoRef.current = true;
  }, [activeConversationId]);

  useLayoutEffect(() => {
    const container = feedContainerRef.current;
    if (!container || !activeConversationId) return;

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
        const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 150;
        const lastMsg = activeMessages[messagesLength - 1];
        const sentByMe = lastMsg?.senderId === user?.id;
        
        if (isNearBottom || sentByMe) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    } else if (messagesLength < prevMessagesLengthRef.current) {
      // Messages deleted/purged
      prevMessagesLengthRef.current = messagesLength;
    }
  }, [activeMessages, activeConversationId, user?.id]);

  // ---- Infinite scroll (load more older messages on scroll up) ----
  const hasMore = activeConversationId ? hasMoreMessages[activeConversationId] !== false : false;

  const loadMoreMessages = useCallback(async () => {
    if (isFetchingMore || !hasMore || !activeConversationId) return;
    
    const container = feedContainerRef.current;
    if (!container) return;

    // Record scroll positions before dispatching/loading
    scrollHeightBeforeLoadRef.current = container.scrollHeight;
    scrollTopBeforeLoadRef.current = container.scrollTop;
    
    isFetchingMoreRef.current = true;
    setIsFetchingMore(true);

    const currentMessages = messages[activeConversationId] || [];
    const offset = currentMessages.length;

    try {
      await dispatch(fetchMessages({
        conversationId: activeConversationId,
        limit: 20,
        offset
      })).unwrap();
    } catch (err) {
      console.error('Failed to load older messages:', err);
      isFetchingMoreRef.current = false;
      setIsFetchingMore(false);
    }
  }, [activeConversationId, isFetchingMore, hasMore, messages, dispatch]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop < 20 && !isFetchingMore && hasMore) {
      loadMoreMessages();
    }
  }, [isFetchingMore, hasMore, loadMoreMessages]);

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
    if (!messageInput.trim() || !activeConversationId) return;
    socketManager.sendMessage(activeConversationId, messageInput.trim());
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketManager.stopTyping(activeConversationId);
    setIsTypingState(false);
    setMessageInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    if (!activeConversationId) return;
    if (!isTypingState) {
      setIsTypingState(true);
      socketManager.startTyping(activeConversationId);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketManager.stopTyping(activeConversationId);
      setIsTypingState(false);
    }, 1500);
  };

  // ---- Delete conversation ----
  const handleDeleteConversation = (convoId: string | null) => {
    if (!convoId) return;
    if (window.confirm('Remove this thread and all messages?')) {
      dispatch(deleteConversation(convoId));
    }
  };

  // ---- Conversation display name helper ----
  const getConversationDetails = (convo: any) => {
    if (!user) return null;
    if (convo.name) return { name: convo.name, letter: convo.name[0].toUpperCase() };

    let recipientId = convoRecipients[convo.id];
    if (!recipientId) {
      const roomMsgs = messages[convo.id] || [];
      const recipientMsg = roomMsgs.find((m) => m.senderId !== user.id);
      if (recipientMsg) recipientId = recipientMsg.senderId;
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

  if (!user) return <div className="flex-1" />;

  const activeConvo   = conversations.find((c) => c.id === activeConversationId);
  const activeDetails = activeConvo ? getConversationDetails(activeConvo) : null;
  const activeStatus: string = activeDetails?.id ? (onlineUsers[activeDetails.id] || 'offline') : 'offline';
  const isActiveTyping = activeConversationId && typingUsers[activeConversationId]
    ? Object.entries(typingUsers[activeConversationId]).some(([uid, typing]) => uid !== user.id && typing)
    : false;

  return (
    <div className="glass-panel flex flex-col overflow-hidden h-full flex-1 min-w-0">
      {activeConversationId && (activeDetails || isChannelMode) ? (
        <>
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b"
            style={{
              borderColor: 'var(--border-muted)',
              background: 'var(--bg-sidebar)',
              borderTopLeftRadius: '1rem',
              borderTopRightRadius: '1rem',
            }}>
            {isChannelMode ? (
              /* Channel mode header */
              <div className="flex-1 min-w-0 flex items-center gap-2.5">
                <span style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
                    <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
                  </svg>
                </span>
                <h3 className="text-[16px] font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                  {activeChannelName || activeDetails?.name || ''}
                </h3>
                {isActiveTyping && (
                  <span className="text-[11.5px] font-medium ml-2" style={{ color: 'var(--accent-primary)' }}>typing…</span>
                )}
              </div>
            ) : (
              <>
                <Avatar letter={activeDetails?.letter || ''} status={activeStatus} size="md" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                    {activeDetails?.name || ''}
                  </h3>
                  {isActiveTyping ? (
                    <span className="text-[11.5px] font-medium" style={{ color: 'var(--accent-primary)' }}>
                      typing…
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11.5px] mt-0.5">
                      <PresenceDot status={activeStatus} size={7} />
                      <span style={{ color: PRESENCE_DOT_COLORS[activeStatus as PresenceStatus] || 'var(--text-muted)' }}>
                        {STATUS_TEXTS[activeStatus as PresenceStatus] || 'Offline'}
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
                className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-all duration-200 flex-shrink-0"
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  border: '1.5px solid var(--danger-border)',
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'var(--danger)';
                  b.style.color = 'white';
                  b.style.borderColor = 'var(--danger)';
                  b.style.boxShadow = '0 4px 14px rgba(239,68,68,0.3)';
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'var(--danger-bg)';
                  b.style.color = 'var(--danger)';
                  b.style.borderColor = 'var(--danger-border)';
                  b.style.boxShadow = 'none';
                }}
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
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isMembersListOpen ? 'var(--accent-primary)' : 'var(--text-muted)',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-input)';
                  if (!isMembersListOpen) e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  if (!isMembersListOpen) e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
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
            className="flex-1 overflow-y-auto flex flex-col gap-3.5 p-5"
            style={{ background: 'var(--bg-chat)' }}>
            
            {isFetchingMore && (
              <div className="flex justify-center py-2 flex-shrink-0">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
              </div>
            )}
            {activeMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-[13.5px]"
                style={{ color: 'var(--text-muted)' }}>
                <IconChat />
                <span>No messages yet. Send a greeting to begin.</span>
              </div>
            ) : (
              activeMessages.map((msg) => {
                const isOut = msg.senderId === user.id;
                const senderProfile = userProfiles[msg.senderId];
                const senderName = isOut
                  ? (user.displayName || user.email.split('@')[0])
                  : (senderProfile?.displayName || senderProfile?.email?.split('@')[0] || 'User');

                if (isChannelMode) {
                  // Discord-style: messages left-aligned with sender name
                  return (
                    <div key={msg.id} className="flex items-start gap-3 animate-fade-in group">
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: isOut ? 'var(--accent-primary)' : 'var(--bg-input)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: isOut ? 'white' : 'var(--text-primary)',
                          flexShrink: 0,
                          border: '2px solid var(--glass-border)',
                        }}
                      >
                        {senderName[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: isOut ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                            {senderName}
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id}
                    className={`flex flex-col max-w-[68%] animate-fade-in ${isOut ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className={`px-4 py-2.5 rounded-[18px] text-[14px] leading-relaxed break-words ${isOut ? 'msg-bubble-out' : 'msg-bubble-in'}`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {isActiveTyping && (
              <div className="self-start flex items-center gap-1.5 px-4 py-3 rounded-[18px] animate-fade-in msg-bubble-in">
                <span className="typing-dot" style={{ animationDelay: '0s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.30s' }} />
              </div>
            )}

            <div ref={feedEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 py-3.5 border-t"
            style={{
              borderColor: 'var(--border-muted)',
              background: 'var(--bg-sidebar)',
              borderBottomLeftRadius: '1rem',
              borderBottomRightRadius: '1rem',
            }}>
            <form className="flex gap-2.5 items-end" onSubmit={handleSendMessage}>
              <textarea
                id="message-input"
                className="input-base flex-1 rounded-xl px-4 py-3 text-[14px] resize-none leading-relaxed"
                style={{
                  minHeight: '46px',
                  maxHeight: '120px',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Type a message… (Enter to send)"
                value={messageInput}
                onChange={handleInputChange}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
                }}
              />
              <button
                id="send-message-btn"
                type="submit"
                disabled={!messageInput.trim()}
                className="btn-send w-[46px] h-[46px] rounded-xl flex-shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                onMouseEnter={(e) => { if (messageInput.trim()) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--btn-shadow)'; } }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
              >
                <IconSend />
              </button>
            </form>
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center gap-4"
          style={{ background: 'var(--bg-chat)', borderRadius: '1rem' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center animate-float border"
            style={{
              background: 'var(--theme-btn-active)',
              borderColor: 'var(--accent-primary)',
            }}>
            <IconChat />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            RelayFlow Workspace
          </h2>
          <p className="text-[13.5px] max-w-[290px] text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Select a conversation from the sidebar or search for a contact to start messaging.
          </p>
          <button
            id="empty-compose-btn"
            className="mt-1 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white cursor-pointer transition-all duration-200 border-none btn-send"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--btn-shadow)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
            onClick={() => setIsComposeOpen(true)}
          >
            Start a conversation
          </button>
        </div>
      )}
    </div>
  );
};
