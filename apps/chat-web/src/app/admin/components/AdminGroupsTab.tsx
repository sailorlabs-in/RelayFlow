'use client';

import React from 'react';
import type { GroupData } from './adminTypes';

interface AdminGroupsTabProps {
  groups: GroupData[];
  groupSearch: string;
  setGroupSearch: (val: string) => void;
  onAddMemberClick: (g: GroupData) => void;
}

export const AdminGroupsTab: React.FC<AdminGroupsTabProps> = ({
  groups,
  groupSearch,
  setGroupSearch,
  onAddMemberClick,
}) => {
  const filteredGroups = groups.filter((g) => {
    const q = groupSearch.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      (g.description && g.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 border border-glass bg-theme-sidebar/10 rounded-2xl p-5 shadow-sm">
      {/* Search bar */}
      <div className="relative shrink-0 mb-4">
        <input
          type="text"
          placeholder="Search group by name or description..."
          value={groupSearch}
          onChange={(e) => setGroupSearch(e.target.value)}
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

      {/* Groups Table Scroll */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-glass/40">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--glass-border)]">
            <tr className="text-theme-muted text-[10px] font-bold uppercase tracking-wider">
              <th className="px-6 py-3 w-[250px]">Server Identity</th>
              <th className="px-6 py-3 w-[300px]">Description</th>
              <th className="px-6 py-3 w-[220px]">Group Owner</th>
              <th className="px-6 py-3 w-[120px]">Members</th>
              <th className="px-6 py-3 w-[110px]">Created</th>
              <th className="px-6 py-3 text-right w-[150px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--glass-border)] text-xs text-theme-primary">
            {filteredGroups.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-theme-muted font-semibold"
                >
                  No groups found
                </td>
              </tr>
            ) : (
              filteredGroups.map((g) => (
                <tr
                  key={g.id}
                  className="hover:bg-theme-sidebar/10 transition-colors"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-theme-secondary flex items-center justify-center font-extrabold text-white uppercase shrink-0 shadow-sm border border-glass/20">
                        {g.name[0]}
                      </div>
                      <span className="font-bold text-theme-primary truncate">
                        {g.name}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-6 py-3.5 truncate text-theme-muted font-medium"
                    title={g.description}
                  >
                    {g.description || 'No description provided'}
                  </td>
                  <td className="px-6 py-3.5">
                    {g.owner ? (
                      <div className="min-w-0">
                        <p className="font-bold text-theme-primary truncate leading-tight">
                          {g.owner.displayName || 'No Name'}
                        </p>
                        <p className="text-[10px] text-theme-muted font-mono truncate mt-0.5">
                          @{g.owner.username || 'unknown'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-theme-muted font-mono text-[9px] bg-theme-input px-1.5 py-0.5 rounded border border-glass">
                        Orphaned
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-theme-input border border-glass text-theme-primary font-bold">
                      {g.memberCount} member
                      {g.memberCount !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-theme-muted font-medium">
                    {new Date(g.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => onAddMemberClick(g)}
                      className="btn-send px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-white cursor-pointer transition-all active-press shadow-sm hover:brightness-110"
                    >
                      Add Member
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
