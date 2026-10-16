import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getContrastColor } from './chatUtils';

interface MessageContentRendererProps {
  content: string;
  isMarkdownMsg?: boolean;
  isMdMode?: boolean;
  isChannelMode: boolean;
  currentUser?: any;
  activeGroup?: any;
  findUserByName: (name: string) => any;
  onOpenProfile: (e: React.MouseEvent, userId: string) => void;
  onViewCode: (code: { code: string; language: string }) => void;
  isMobile: boolean;
}

export const MessageContentRenderer: React.FC<MessageContentRendererProps> = ({
  content,
  isMarkdownMsg,
  isMdMode,
  isChannelMode,
  currentUser,
  activeGroup,
  findUserByName,
  onOpenProfile,
  onViewCode,
  isMobile,
}) => {
  if (!content) {
    return null;
  }

  if (isMarkdownMsg || isMdMode) {
    return (
      <div className="markdown-body prose prose-sm dark:prose-invert max-w-none break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            pre({ node, children, ...props }: any) {
              try {
                if (isMobile) {
                  const codeElement = React.Children.toArray(
                    children,
                  )[0] as any;
                  if (codeElement && codeElement.props) {
                    const codeString = String(
                      codeElement.props.children,
                    ).replace(/\n$/, '');
                    const match = /language-(\w+)/.exec(
                      codeElement.props.className || '',
                    );
                    const lang = match ? match[1] : '';
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onViewCode({
                            code: codeString,
                            language: lang,
                          });
                        }}
                        className="w-full text-left my-2 p-3 rounded-xl border border-glass bg-theme-input/40 hover:bg-theme-input/60 transition-all flex items-center justify-between gap-3 text-theme-primary font-sans cursor-pointer group active-press"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-(--accent-primary)/10 text-(--accent-primary) shrink-0 group-hover:scale-105 transition-transform">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              className="w-4 h-4"
                            >
                              <polyline points="16 18 22 12 16 6" />
                              <polyline points="8 6 2 12 8 18" />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-bold leading-tight">
                              [Message with code]
                            </div>
                            <div className="text-[10px] text-theme-muted truncate mt-0.5">
                              {lang
                                ? `${lang} code block`
                                : 'Click to view code snippet'}
                            </div>
                          </div>
                        </div>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="w-4 h-4 text-theme-muted opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    );
                  }
                }
              } catch (err) {
                console.error('Error rendering mobile code block:', err);
              }
              return <pre {...props}>{children}</pre>;
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            code({ node, inline, className, children, ...props }: any) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  if (!isChannelMode) {
    return <>{content}</>;
  }

  const parts = content.split(/(@everyone|@[a-zA-Z0-9_.-]+)/g);
  const currentUserTag = currentUser?.username
    ? `@${currentUser.username}`
    : '';

  return (
    <>
      {parts.map((part, idx) => {
        if (part === '@everyone') {
          const textColor = getContrastColor('var(--accent-primary)');
          const borderColor =
            textColor === '#ffffff'
              ? 'rgba(255, 255, 255, 0.35)'
              : 'rgba(0, 0, 0, 0.18)';
          return (
            <span
              key={idx}
              className="font-semibold px-1.5 py-0.5 rounded text-[13px] shadow-xs"
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
          if (resolvedUser?.id && activeGroup) {
            const member = activeGroup?.members?.find(
              (m: any) => m.userId === resolvedUser.id,
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
            const color = isOwner ? '#eab308' : matchingRoles[0]?.color || null;
            if (color && color !== 'inherit') {
              roleColor = color;
            }
          }

          const isMe =
            currentUserTag &&
            part.toLowerCase() === currentUserTag.toLowerCase();

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
                    onOpenProfile(e, resolvedUser.id);
                  }
                }}
                className="font-semibold px-1.5 py-0.5 rounded text-[13px] shadow-xs cursor-pointer hover:opacity-90 active:scale-95 transition-all"
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
                    onOpenProfile(e, resolvedUser.id);
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
      })}
    </>
  );
};
