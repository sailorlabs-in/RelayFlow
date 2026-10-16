import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../../store/slices/chatSlice';
import { EmojiPicker } from './EmojiPickerWrapper';
import { AnimatedEmoji } from '../AnimatedEmoji';
import { getEmojiSegments } from '../../utils/animatedEmoji';
import { Avatar } from '../Avatar';
import {
  IconSend,
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
  IconCamera,
  IconImage,
} from '../Icons';

interface ChatInputAreaProps {
  replyingToMessage: Message | null;
  onCancelReply: () => void;
  attachedFiles: {
    url: string;
    thumbnailUrl?: string;
    name: string;
    size: number;
    type: string;
  }[];
  onRemoveAttachment: (file: { url: string; thumbnailUrl?: string }) => void;
  canSendMessages: boolean;
  canAttachFiles: boolean;
  isChannelMode: boolean;
  activeChannel?: any;
  hasChannelWriteAccess: boolean;
  uploading: boolean;
  messageInput: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  isMobile: boolean;
  isMobileScreen: boolean;
  isMdMode: boolean;
  setIsMdMode: React.Dispatch<React.SetStateAction<boolean>>;
  mdTab: 'write' | 'preview';
  setMdTab: React.Dispatch<React.SetStateAction<'write' | 'preview'>>;
  showEmojiPicker: boolean;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  onEmojiSelect: (emoji: any) => void;
  processFiles: (files: File[]) => void;
  matchingMentions: {
    id: string;
    name: string;
    isEveryone?: boolean;
    member?: any;
  }[];
  activeSuggestIndex: number;
  setActiveSuggestIndex: React.Dispatch<React.SetStateAction<number>>;
  atMentionQuery: { text: string; start: number; end: number } | null;
  setAtMentionQuery: (
    q: { text: string; start: number; end: number } | null,
  ) => void;
  mentionQuery: { text: string; start: number; end: number } | null;
  setMentionQuery: (
    q: { text: string; start: number; end: number } | null,
  ) => void;
  emojiResults: any[];
  setEmojiResults: (res: any[]) => void;
  setMessageInput: React.Dispatch<React.SetStateAction<string>>;
  userProfiles: Record<string, any>;
  currentUser: any;
  activeGroup?: any;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  replyingToMessage,
  onCancelReply,
  attachedFiles,
  onRemoveAttachment,
  canSendMessages,
  canAttachFiles,
  isChannelMode,
  activeChannel,
  hasChannelWriteAccess,
  uploading,
  messageInput,
  onInputChange,
  onSendMessage,
  isMobile,
  isMobileScreen,
  isMdMode,
  setIsMdMode,
  mdTab,
  setMdTab,
  showEmojiPicker,
  setShowEmojiPicker,
  onEmojiSelect,
  processFiles,
  matchingMentions,
  activeSuggestIndex,
  setActiveSuggestIndex,
  atMentionQuery,
  setAtMentionQuery,
  mentionQuery,
  setMentionQuery,
  emojiResults,
  setEmojiResults,
  setMessageInput,
  userProfiles,
  currentUser,
  activeGroup,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiPickerContainerRef = useRef<HTMLDivElement>(null);
  const mobileAttachMenuRef = useRef<HTMLDivElement>(null);

  const [showMobileAttachMenu, setShowMobileAttachMenu] = useState(false);
  const [emojiPickerStyle, setEmojiPickerStyle] = useState<React.CSSProperties>(
    {
      opacity: 0,
      pointerEvents: 'none',
    },
  );

  // Calculate emoji picker position
  const handleEmojiPickerToggle = () => {
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
      return;
    }

    if (isMobile) {
      setShowEmojiPicker(true);
      return;
    }

    if (emojiPickerRef.current) {
      const pickerWidth = 352;
      const margin = 12;

      const chatContainer =
        emojiPickerRef.current.closest<HTMLElement>('.glass-panel') ||
        document.body;
      const chatRect = chatContainer.getBoundingClientRect();
      const btnRect = emojiPickerRef.current.getBoundingClientRect();

      let left = 0;
      const spaceRight = chatRect.right - btnRect.left;
      if (spaceRight < pickerWidth + margin) {
        left = -(pickerWidth - btnRect.width);
      }

      const style: React.CSSProperties = {
        bottom: 'calc(100% + 12px)',
        left: `${left}px`,
        opacity: 1,
        pointerEvents: 'auto',
      };

      setEmojiPickerStyle(style);
    }

    setShowEmojiPicker(true);
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showEmojiPicker &&
        !isMobile &&
        emojiPickerContainerRef.current &&
        !emojiPickerContainerRef.current.contains(target) &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(target)
      ) {
        setShowEmojiPicker(false);
      }

      if (
        showMobileAttachMenu &&
        mobileAttachMenuRef.current &&
        !mobileAttachMenuRef.current.contains(target)
      ) {
        setShowMobileAttachMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, isMobile, showMobileAttachMenu, setShowEmojiPicker]);

  // Formatting helpers for markdown mode
  const applyFormat = (prefix: string, suffix = '') => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.slice(start, end);

    const replacement = prefix + selected + suffix;
    const newText = text.slice(0, start) + replacement + text.slice(end);

    setMessageInput(newText);

    setTimeout(() => {
      el.focus();
      const newCursorPos =
        start + prefix.length + (selected ? selected.length : 0);
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const inputEmojiSegments = getEmojiSegments(messageInput);

  return (
    <div className="p-2 bg-transparent shrink-0">
      <div className="glass-panel p-2.5 border-glass bg-theme-sidebar/40 shadow-[0_10px_35px_rgba(0,0,0,0.15)] rounded-2xl">
        {/* Reply Preview Bar */}
        {replyingToMessage && (
          <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-theme-input/40 border border-white/[0.05] dark:border-white/[0.05] mb-2 animate-fade-in select-none">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-[3px] h-7.5 rounded-full bg-(--accent-primary) shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-(--accent-primary)">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="w-3 h-3 shrink-0"
                  >
                    <polyline points="9 17 4 12 9 7" />
                    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                  </svg>
                  <span className="truncate">
                    Replying to{' '}
                    <span className="text-theme-primary font-bold">
                      {userProfiles[replyingToMessage.senderId]?.displayName ||
                        (userProfiles[replyingToMessage.senderId]?.username
                          ? `@${userProfiles[replyingToMessage.senderId].username}`
                          : null) ||
                        (replyingToMessage.senderId === currentUser?.id
                          ? 'You'
                          : 'User')}
                    </span>
                  </span>
                </div>
                <p className="text-[11.5px] text-theme-muted truncate m-0 font-normal leading-tight">
                  {replyingToMessage.content ||
                    (replyingToMessage.media &&
                    replyingToMessage.media.length > 0
                      ? 'Photo / Attachment'
                      : 'Message')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="w-6 h-6 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-theme-muted hover:text-theme-primary hover:bg-theme-input transition-colors shrink-0"
              title="Cancel reply"
            >
              <IconX size={12} />
            </button>
          </div>
        )}

        {/* Attached Files Chips */}
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
                  onClick={() => onRemoveAttachment(file)}
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {isChannelMode && activeChannel && !hasChannelWriteAccess
              ? 'This channel is read-only.'
              : 'You do not have permission to send messages in this group.'}
          </div>
        ) : (
          <form className="flex gap-2.5 items-end" onSubmit={onSendMessage}>
            {/* Desktop Emoji Picker */}
            <div
              className={`relative ${isMobile ? 'hidden' : 'hidden md:block'}`}
              ref={emojiPickerRef}
            >
              <button
                type="button"
                disabled={!canSendMessages}
                onClick={handleEmojiPickerToggle}
                className="w-11.5 h-11.5 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 bg-theme-input text-theme-muted hover:bg-(--theme-btn-hover) hover:text-theme-primary disabled:opacity-40 disabled:cursor-not-allowed active-press border border-glass"
                title={
                  canSendMessages ? 'Choose an emoji' : 'Permission denied'
                }
              >
                <IconEmoji size={20} />
              </button>

              {showEmojiPicker && !isMobile && (
                <div
                  ref={emojiPickerContainerRef}
                  className="absolute z-50 shadow-(--glass-shadow) rounded-2xl overflow-hidden border-[1.5px] border-glass bg-(--glass-bg) backdrop-blur-[20px] transition-opacity duration-150 ease-out w-[352px] h-[440px]"
                  style={{ ...emojiPickerStyle }}
                >
                  <EmojiPicker
                    onEmojiSelect={onEmojiSelect}
                    theme="auto"
                    dynamicWidth={true}
                    previewPosition="none"
                  />
                </div>
              )}
            </div>

            {/* Desktop Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !canAttachFiles || !canSendMessages}
              className={`${
                isMobile ? 'hidden' : 'hidden md:flex'
              } w-11.5 h-11.5 rounded-xl items-center justify-center shrink-0 transition-all duration-200 bg-theme-input text-theme-muted hover:bg-(--theme-btn-hover) hover:text-theme-primary disabled:opacity-40 disabled:cursor-not-allowed active-press border border-glass`}
              title={
                !canSendMessages
                  ? 'Send messages permission required'
                  : !canAttachFiles
                    ? 'Attach files permission required'
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

            {/* Desktop Markdown Mode Toggle Button - only displayed when turned on so user can turn off */}
            {isMdMode && (
              <button
                type="button"
                onClick={() => setIsMdMode(false)}
                disabled={!canSendMessages}
                className={`${
                  isMobile ? 'hidden' : 'hidden md:flex'
                } relative w-11.5 h-11.5 rounded-xl items-center justify-center shrink-0 transition-all duration-200 border border-(--accent-primary)/40 font-mono text-[11px] font-bold active-press select-none bg-(--accent-primary) text-white shadow-xs hover:opacity-90 cursor-pointer`}
                title="Turn off Markdown mode"
              >
                MD
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[8.5px] font-bold shadow-xs">
                  ✕
                </span>
              </button>
            )}

            {/* Mobile Attachment Button with Dropdown */}
            <div
              className={`relative ${isMobile ? 'block' : 'md:hidden'}`}
              ref={mobileAttachMenuRef}
            >
              <button
                type="button"
                onClick={() => setShowMobileAttachMenu((prev) => !prev)}
                disabled={uploading || (!canAttachFiles && !canSendMessages)}
                className={`w-11.5 h-11.5 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 bg-theme-input text-theme-muted hover:bg-(--theme-btn-hover) hover:text-theme-primary disabled:opacity-40 disabled:cursor-not-allowed active-press border border-glass ${
                  showMobileAttachMenu
                    ? 'bg-(--theme-btn-hover) text-theme-primary ring-2 ring-(--accent-primary)/30'
                    : ''
                }`}
                title="Attach options"
              >
                {uploading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-(--text-primary)" />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`w-5 h-5 transition-transform duration-200 ${
                      showMobileAttachMenu
                        ? 'rotate-45 text-(--accent-primary)'
                        : ''
                    }`}
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </button>

              {/* Mobile Dropdown Menu */}
              {showMobileAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2.5 min-w-[190px] bg-theme-sidebar/95 backdrop-blur-xl border border-glass shadow-(--glass-shadow) rounded-2xl p-1.5 flex flex-col gap-1 z-50 animate-fade-in">
                  <button
                    type="button"
                    disabled={!canSendMessages}
                    onClick={() => {
                      setShowMobileAttachMenu(false);
                      setShowEmojiPicker(true);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13.5px] font-medium text-theme-primary hover:bg-theme-input active-press transition-all cursor-pointer border-none bg-transparent disabled:opacity-40"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500 shrink-0">
                      <IconEmoji size={18} />
                    </div>
                    <span className="truncate">Add emoji</span>
                  </button>

                  <button
                    type="button"
                    disabled={uploading || !canAttachFiles || !canSendMessages}
                    onClick={() => {
                      setShowMobileAttachMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13.5px] font-medium text-theme-primary hover:bg-theme-input active-press transition-all cursor-pointer border-none bg-transparent disabled:opacity-40"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary) shrink-0">
                      <IconImage size={18} />
                    </div>
                    <span className="truncate">Attach media</span>
                  </button>

                  <button
                    type="button"
                    disabled={uploading || !canAttachFiles || !canSendMessages}
                    onClick={() => {
                      setShowMobileAttachMenu(false);
                      cameraInputRef.current?.click();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13.5px] font-medium text-theme-primary hover:bg-theme-input active-press transition-all cursor-pointer border-none bg-transparent disabled:opacity-40"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500 shrink-0">
                      <IconCamera size={18} />
                    </div>
                    <span className="truncate">Open camera</span>
                  </button>

                  {isMdMode && (
                    <button
                      type="button"
                      disabled={!canSendMessages}
                      onClick={() => {
                        setShowMobileAttachMenu(false);
                        setIsMdMode(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13.5px] font-medium active-press transition-all cursor-pointer border-none bg-(--accent-primary)/15 text-(--accent-primary)"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500 font-mono font-bold text-xs shrink-0">
                        MD
                      </div>
                      <span className="truncate">Exit Markdown</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*"
              capture="environment"
              className="hidden"
            />

            <div className="relative flex-1 flex flex-col justify-end min-w-0">
              {/* Emoji Suggestions Popover */}
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
                        textareaRef.current?.focus();
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

              {/* Mentions Suggestions Popover */}
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
                              textareaRef.current?.focus();
                            }}
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-(--accent-primary) text-white text-[12px] font-bold shrink-0">
                              📢
                            </div>
                            <div className="flex flex-col">
                              <span
                                className={`text-[13px] font-bold ${
                                  isActive
                                    ? 'text-theme-secondary'
                                    : 'text-theme-primary'
                                }`}
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
                      const letter = memberName[0]?.toUpperCase() || 'U';

                      const isOwnerMember =
                        activeGroup.ownerId === member.userId;
                      const memberRoleIds = member.roleIds || [];
                      const topRole = activeGroup.roles?.find((r: any) =>
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
                            textareaRef.current?.focus();
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
                              className={`text-[13px] font-bold ${
                                !memberColor
                                  ? isActive
                                    ? 'text-theme-secondary'
                                    : 'text-theme-primary'
                                  : ''
                              }`}
                              style={
                                memberColor ? { color: memberColor } : undefined
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

              {/* Markdown Toolbar */}
              {isMdMode && (
                <div className="flex items-center justify-between mb-2 px-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMdTab(mdTab === 'write' ? 'preview' : 'write')
                      }
                      className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-(--accent-primary) transition-colors flex items-center gap-1.5 cursor-pointer"
                      title={mdTab === 'write' ? 'Preview' : 'Edit'}
                    >
                      {mdTab === 'write' ? <IconEye /> : <IconCompose />}
                      <span className="text-[12px] font-semibold">
                        {mdTab === 'write' ? 'Preview' : 'Edit'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMdMode(false)}
                      className="px-2 py-0.5 text-[11px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors border border-red-500/20 active-press cursor-pointer"
                      title="Turn off Markdown mode"
                    >
                      Turn Off MD
                    </button>
                  </div>

                  {mdTab === 'write' && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyFormat('# ')}
                        className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center min-w-[24px]"
                        title="Heading 1"
                      >
                        <span className="text-[11px] font-bold">H1</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat('## ')}
                        className="p-1.5 hover:bg-theme-input rounded text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center min-w-[24px]"
                        title="Heading 2"
                      >
                        <span className="text-[11px] font-bold">H2</span>
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

              {/* Animated Emoji Live Input Preview */}
              {inputEmojiSegments &&
                inputEmojiSegments.length >= 1 &&
                inputEmojiSegments.length <= 2 && (
                  <div className="flex items-center gap-2 px-2.5 py-1 mb-2 rounded-2xl bg-theme-sidebar/90 border border-glass shadow-(--glass-shadow) backdrop-blur-md animate-slide-up select-none w-fit">
                    {inputEmojiSegments.map((glyph, idx) => (
                      <AnimatedEmoji
                        key={`input-preview-${glyph}-${idx}`}
                        glyph={glyph}
                        size={40}
                        alwaysAnimate
                      />
                    ))}
                  </div>
                )}

              {/* Textarea */}
              {(!isMdMode || mdTab === 'write') && (
                <textarea
                  ref={textareaRef}
                  id="message-input"
                  disabled={!canSendMessages}
                  className={`input-base w-full block rounded-xl px-4 text-[14px] resize-none leading-normal bg-theme-input/40 border-[1.5px] border-glass text-theme-primary focus:outline-none focus:border-(--accent-primary) focus:ring-[3px] focus:ring-(--accent-ring) disabled:opacity-50 disabled:cursor-not-allowed box-border transition-all ${
                    isMdMode ? 'max-h-64' : 'max-h-30'
                  }`}
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
                          : 'Type a message… (Enter to send, Shift+Enter for new line)'
                        : isChannelMode &&
                            activeChannel &&
                            !hasChannelWriteAccess
                          ? 'This channel is read-only.'
                          : 'You do not have permission to send messages in this group.'
                  }
                  rows={isMdMode ? 4 : 1}
                  value={messageInput}
                  onChange={onInputChange}
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
                          (prev) => (prev + 1) % matchingMentions.length,
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
                        const selected = matchingMentions[activeSuggestIndex];
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
                            textareaRef.current?.focus();
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
                      onCancelReply();
                      return;
                    }

                    if (e.key === 'Enter' && !e.shiftKey) {
                      if (messageInput.trim().toLowerCase() === '/md') {
                        e.preventDefault();
                        setIsMdMode(true);
                        setMessageInput('');
                        return;
                      }
                      if (!isMdMode) {
                        e.preventDefault();
                        if (canSendMessages) {
                          onSendMessage(e);
                        }
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

              {/* Markdown Preview Tab */}
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

            {/* Send Button */}
            <button
              id="send-message-btn"
              type="submit"
              disabled={
                (!messageInput.trim() && attachedFiles.length === 0) ||
                !canSendMessages
              }
              className="btn-send w-11.5 h-11.5 rounded-xl shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-(--btn-shadow) active-press flex items-center justify-center shadow-sm"
              title="Send message"
            >
              <IconSend />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
