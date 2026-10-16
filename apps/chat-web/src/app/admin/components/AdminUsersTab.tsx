'use client';

import React from 'react';
import { Avatar } from '../../../components/Avatar';
import type { UserData } from './adminTypes';
import { formatLastSeen } from './adminTypes';

interface AdminUsersTabProps {
  users: UserData[];
  userSearch: string;
  setUserSearch: (val: string) => void;
  onOpenMenu: (u: UserData, e: React.MouseEvent<HTMLButtonElement>) => void;
  activeMenuUserId?: string;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  userSearch,
  setUserSearch,
  onOpenMenu,
  activeMenuUserId,
}) => {
  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 border border-glass bg-theme-sidebar/10 rounded-2xl p-5 shadow-sm">
      {/* Search bar */}
      <div className="relative shrink-0 mb-4">
        <input
          type="text"
          placeholder="Search user by email, name or username..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="input-base focus:input-focus w-full pl-9 pr-4 py-2.5 text-xs rounded-xl placeholder-theme-muted transition-all"
        />
        <svg
          className="w-4 h-4 absolute left-3 top-3 text-theme-muted pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Users Table Scroll */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-glass/40">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--glass-border)]">
            <tr className="text-theme-muted text-[10px] font-bold uppercase tracking-wider">
              <th className="px-6 py-3 w-[220px]">User Profile</th>
              <th className="px-6 py-3 w-[200px]">Email</th>
              <th className="px-6 py-3 w-[100px]">Role</th>
              <th className="px-6 py-3 w-[110px]">Warnings</th>
              <th className="px-6 py-3 w-[180px]">Status</th>
              <th className="px-6 py-3 w-[130px]">Visibility</th>
              <th className="px-6 py-3 w-[110px]">Joined</th>
              <th className="px-6 py-3 text-right w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--glass-border)] text-xs text-theme-primary">
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-theme-muted font-semibold"
                >
                  No matching users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-theme-sidebar/10 transition-colors"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        letter={(u.displayName || u.username || 'U')
                          .trim()[0]
                          .toUpperCase()}
                        url={u.avatarUrl}
                        status={u.status}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-theme-primary truncate leading-tight">
                          {u.displayName || 'No Name'}
                        </p>
                        <p className="text-[10px] text-theme-muted font-mono truncate mt-0.5">
                          @{u.username || 'unknown'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-theme-secondary text-[11px] truncate">
                    {u.email}
                  </td>
                  <td className="px-6 py-3.5">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-theme-input text-theme-muted border border-glass">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {u.warnings && u.warnings.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20 font-bold">
                        {u.warnings.length} Warned
                      </span>
                    ) : (
                      <span className="text-theme-muted font-medium text-xs">
                        Clean
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {(() => {
                      const s = u.status || 'offline';
                      const cfg: Record<
                        string,
                        {
                          dot: string;
                          text: string;
                          label: string;
                          pulse?: boolean;
                        }
                      > = {
                        online: {
                          dot: 'bg-emerald-400',
                          text: 'text-emerald-400',
                          label: 'Online',
                          pulse: true,
                        },
                        away: {
                          dot: 'bg-amber-400',
                          text: 'text-amber-400',
                          label: 'Away',
                        },
                        dnd: {
                          dot: 'bg-red-400',
                          text: 'text-red-400',
                          label: 'DND',
                        },
                        offline: {
                          dot: 'bg-slate-500',
                          text: 'text-theme-muted',
                          label: 'Offline',
                        },
                      };
                      const c = cfg[s] ?? cfg.offline;
                      let displayLabel = c.label;
                      if (s === 'offline' && u.lastSeen) {
                        displayLabel = `Offline (${formatLastSeen(u.lastSeen)})`;
                      }
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold text-xs ${c.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${c.dot}${c.pulse ? ' animate-pulse' : ''}`}
                          />
                          {displayLabel}
                        </span>
                      );
                    })()}
                  </td>

                  <td className="px-6 py-3.5">
                    {(() => {
                      const vis = u.visibility || 'everyone';
                      if (vis === 'noone') {
                        return (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              className="w-2.5 h-2.5 shrink-0"
                            >
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            Private
                          </span>
                        );
                      }
                      if (vis === 'friends_of_friends') {
                        return (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              className="w-2.5 h-2.5 shrink-0"
                            >
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            Mutuals
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="w-2.5 h-2.5 shrink-0"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M21 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                          </svg>
                          Everyone
                        </span>
                      );
                    })()}
                  </td>

                  <td className="px-6 py-3.5 text-theme-muted font-medium">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3.5 text-right overflow-visible">
                    <button
                      onClick={(e) => onOpenMenu(u, e)}
                      className={`p-1.5 rounded-lg border border-glass bg-theme-input hover:bg-theme-input-focus text-theme-primary text-xs font-bold cursor-pointer transition-all inline-flex items-center justify-center shrink-0 active:scale-95 ${
                        activeMenuUserId === u.id ? 'bg-theme-input-focus' : ''
                      }`}
                      title="User Actions"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
