import React from 'react';
import { AutoDeletionSettings } from '../../../components/AutoDeletionSettings';

interface RetentionTabProps {
  retentionMediaDays: number;
  setRetentionMediaDays: (days: number) => void;
  retentionMessageDays: number;
  setRetentionMessageDays: (days: number) => void;
}

export const RetentionTab: React.FC<RetentionTabProps> = ({
  retentionMediaDays,
  setRetentionMediaDays,
  retentionMessageDays,
  setRetentionMessageDays,
}) => {
  return (
    <div className="flex flex-col gap-6 flex-1">
      <AutoDeletionSettings
        mediaDays={retentionMediaDays}
        setMediaDays={setRetentionMediaDays}
        messageDays={retentionMessageDays}
        setMessageDays={setRetentionMessageDays}
        hideSaveButton={true}
      />
    </div>
  );
};
