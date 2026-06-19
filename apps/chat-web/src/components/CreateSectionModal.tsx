import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import type { GroupSection } from '../store/slices/groupsSlice';
import { createSection, updateSection } from '../store/slices/groupsSlice';

import { IconX } from './Icons';
import { showToast } from './toast';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div
      className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-[rgba(4,6,12,0.65)] backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-110 max-w-full bg-(--glass-bg) border-[1.5px] border-glass backdrop-blur-[20px] rounded-[18px] shadow-(--glass-shadow) overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-theme flex items-start justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-theme-primary">
              {section ? 'Category Settings' : 'Create Category'}
            </h2>
            <p className="m-1 text-[12.5px] text-theme-muted">
              In <strong className="text-theme-secondary">{group?.name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-theme-muted p-1 rounded-md flex items-center active-press"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="px-5 py-5 max-h-[70vh] overflow-y-auto"
        >
          <div className="mb-4">
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

          {/* Private Section Toggle */}
          <div className="mb-4 mt-5 p-3 rounded-[10px] border-[1.5px] border-glass bg-[rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-theme-primary">
                  Private Category
                </span>
                <p className="m-0 mt-0.5 text-xs text-theme-muted">
                  Only selected roles will be able to view this category and its
                  channels
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-theme-input peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-(--accent-primary)"></div>
              </label>
            </div>

            {isPrivate && (
              <div className="mt-4 border-t border-theme pt-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-2">
                  Select Roles
                </span>
                {roles.length === 0 ? (
                  <p className="m-0 text-xs text-theme-muted italic">
                    No custom roles exist. Create roles in Server Settings
                    first, or only Owners/Admins will access this category.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-30 overflow-y-auto pr-1">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-2.5 text-sm cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={allowedRoleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllowedRoleIds([...allowedRoleIds, role.id]);
                            } else {
                              setAllowedRoleIds(
                                allowedRoleIds.filter((id) => id !== role.id),
                              );
                            }
                          }}
                          className="rounded border-glass text-(--accent-primary) focus:ring-(--accent-primary)"
                        />
                        <span
                          style={{ color: role.color }}
                          className="font-semibold text-theme-primary"
                        >
                          {role.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-[10px] border-[1.5px] border-glass bg-transparent text-theme-secondary text-sm font-semibold cursor-pointer active-press"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !sectionName.trim()}
            className="btn-send px-6 py-2.5 rounded-[10px] border-none text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 active-press"
          >
            {isLoading
              ? 'Saving…'
              : section
                ? 'Save Changes'
                : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
};
