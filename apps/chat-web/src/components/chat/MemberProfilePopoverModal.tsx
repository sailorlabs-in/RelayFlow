import React from 'react';
import { MemberProfilePopover } from '../MemberProfilePopover';

interface MemberProfilePopoverModalProps {
  userId: string | null;
  popoverPosition: { top: number; right?: number; left?: number } | null;
  selectedMember: any;
  groupId?: string;
  onClose: () => void;
}

export const MemberProfilePopoverModal: React.FC<
  MemberProfilePopoverModalProps
> = ({ userId, popoverPosition, selectedMember, groupId, onClose }) => {
  if (!userId || !popoverPosition || !selectedMember) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-9998 bg-transparent cursor-default"
        onClick={onClose}
      />
      <MemberProfilePopover
        selectedMember={selectedMember}
        popoverPosition={popoverPosition}
        onClose={onClose}
        groupId={groupId}
      />
    </>
  );
};
