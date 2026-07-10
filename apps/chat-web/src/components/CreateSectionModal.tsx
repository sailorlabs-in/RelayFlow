import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { GroupSection } from '../store/slices/groupsSlice';
import { createSection, updateSection } from '../store/slices/groupsSlice';

import { IconX, IconLock } from './Icons';
import { showToast } from './toast';

// ─── Role Permission Row ────────────────────────────────────────────────────
const RolePermissionRow = ({
  role,
  isAllowed,
  onToggle,
}: {
  role: GroupRole;
  isAllowed: boolean;
  onToggle: () => void;
}) => (
  <div
    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
      isAllowed
        ? 'bg-[rgba(59,165,93,0.08)] border border-[rgba(59,165,93,0.2)]'
        : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.04)]'
    }`}
    onClick={onToggle}
  >
    <div className="flex items-center gap-2.5">
      {/* Role color dot */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: role.color || '#99aab5' }}
      />
      <span
        className="text-[13px] font-medium"
        style={{ color: role.color || 'var(--text-primary)' }}
      >
        {role.name}
      </span>
    </div>

    {/* Toggle */}
    <div
      className={`w-9 h-5 rounded-full relative transition-all flex-shrink-0 ${
        isAllowed ? 'bg-[#3ba55d]' : 'bg-[rgba(255,255,255,0.12)]'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white border border-gray-300 transition-all ${
          isAllowed ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </div>
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────
interface CreateSectionModalProps {
  groupId: string;
  section?: GroupSection; // If passed, we are in edit mode
  onClose: () => void;
}

export const CreateSectionModal = ({
  groupId,
  section,
  onClose,
}: CreateSectionModalProps): React.JSX.Element => {
  const dispatch = useAppDispatch();
  const group = useAppSelector((state) =>
    state.groups.groups.find((g) => g.id === groupId),
  );
  const roles = group?.roles || [];

  const [sectionName, setSectionName] = useState(section?.name || '');
  const [isPrivate, setIsPrivate] = useState(
    section?.allowedRoleIds && section.allowedRoleIds.length > 0 ? true : false,
  );
  const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>(
    section?.allowedRoleIds || [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');

  const isEditMode = !!section;
  const allowedCount = allowedRoleIds.length;

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(roleSearchQuery.toLowerCase()),
  );

  const handleToggleRole = (roleId: string) => {
    if (allowedRoleIds.includes(roleId)) {
      setAllowedRoleIds(allowedRoleIds.filter((id) => id !== roleId));
    } else {
      setAllowedRoleIds([...allowedRoleIds, roleId]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = sectionName.trim();
    if (!name) {
      showToast.error('Please enter a category name.');
      return;
    }

    setIsLoading(true);
    try {
      if (section) {
        // Edit mode
        await dispatch(
          updateSection({
            groupId,
            sectionId: section.id,
            name,
            allowedRoleIds: isPrivate ? allowedRoleIds : [],
          }),
        ).unwrap();
        showToast.success(`Category "${name}" updated!`);
      } else {
        // Create mode
        await dispatch(
          createSection({
            groupId,
            name,
            allowedRoleIds: isPrivate ? allowedRoleIds : [],
          }),
        ).unwrap();
        showToast.success(`Category "${name}" created!`);
      }
      onClose();
    } catch (err: any) {
      showToast.error(err || 'Failed to save category.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-[rgba(4,6,12,0.65)] backdrop-blur-xs">
      <div
        className="w-[480px] max-w-full bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] rounded-[16px] shadow-(--glass-shadow) overflow-hidden animate-slide-up flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-theme-muted">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="m-0 text-[16px] font-bold text-theme-primary leading-tight">
                {isEditMode ? 'Category Settings' : 'Create Category'}
              </h2>
              <p className="m-0 text-[11px] text-theme-muted">
                In{' '}
                <strong className="text-theme-secondary">{group?.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-theme-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-theme-primary transition-colors active-press"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5 min-h-0">
          {/* Category Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-theme-muted mb-2">
              Category Name <span className="text-(--danger)">*</span>
            </label>
            <input
              type="text"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="e.g. DAILY TALKS"
              maxLength={80}
              required
              autoFocus
              className="input-base w-full py-2.5 px-3.5 rounded-[10px] bg-theme-input border-[1.5px] border-glass text-theme-primary text-sm box-border focus:outline-none focus:border-(--accent-primary) focus:ring-[2.5px] focus:ring-(--accent-ring)"
            />
          </div>

          {/* Private Category Toggle */}
          <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-theme-muted">
                  <IconLock size={18} />
                </div>
                <div>
                  <span className="text-[14px] font-semibold text-theme-primary">
                    Private Category
                  </span>
                  <p className="m-0 mt-0.5 text-[12px] text-[rgba(255,255,255,0.35)]">
                    Only selected roles can view this category and its channels
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[rgba(255,255,255,0.12)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3ba55d]" />
              </label>
            </div>

            {/* Role permissions panel */}
            {isPrivate && (
              <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-theme-muted">
                    Allowed Roles
                  </span>
                  {allowedCount > 0 && (
                    <span className="text-[10px] font-semibold text-[#3ba55d] bg-[rgba(59,165,93,0.12)] px-2 py-0.5 rounded-full">
                      {allowedCount} role{allowedCount !== 1 ? 's' : ''}{' '}
                      selected
                    </span>
                  )}
                </div>

                {/* Role search */}
                {roles.length > 5 && (
                  <div className="mb-3">
                    <input
                      type="text"
                      value={roleSearchQuery}
                      onChange={(e) => setRoleSearchQuery(e.target.value)}
                      placeholder="Search roles..."
                      className="w-full py-2 px-3 rounded-lg text-xs box-border focus:outline-none border-none"
                      style={{
                        backgroundColor: 'var(--bg-input, #1e1f22)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                )}

                {roles.length === 0 ? (
                  <div className="px-3 py-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] text-center">
                    <p className="m-0 text-[12px] text-[rgba(255,255,255,0.35)]">
                      No custom roles exist.
                    </p>
                    <p className="m-0 mt-1 text-[11px] text-[rgba(255,255,255,0.25)]">
                      Create roles in Server Settings first, or only
                      Owners/Admins will access this category.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {filteredRoles.map((role) => (
                      <RolePermissionRow
                        key={role.id}
                        role={role}
                        isAllowed={allowedRoleIds.includes(role.id)}
                        onToggle={() => handleToggleRole(role.id)}
                      />
                    ))}
                    {filteredRoles.length === 0 && (
                      <div className="py-3 text-center text-[11px] text-[rgba(255,255,255,0.25)]">
                        No roles match "{roleSearchQuery}"
                      </div>
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="mt-3 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
                  <p className="m-0 text-[11px] text-[rgba(255,255,255,0.3)] leading-relaxed">
                    Server owners and admins can always see private categories.
                    Channels inside this category will inherit its visibility
                    settings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-5 py-3.5 border-t border-[rgba(255,255,255,0.06)] flex justify-end gap-2.5 flex-shrink-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border-none bg-transparent text-[13px] font-medium text-theme-secondary cursor-pointer hover:underline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !sectionName.trim()}
            className="px-5 py-2 rounded-md border-none text-[13px] font-semibold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            style={{
              background: 'linear-gradient(135deg, #5865f2, #4752c4)',
              boxShadow: '0 2px 12px rgba(88, 101, 242, 0.3)',
            }}
          >
            {isLoading
              ? 'Saving…'
              : isEditMode
                ? 'Save Changes'
                : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
};
