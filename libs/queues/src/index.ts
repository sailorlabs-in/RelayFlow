export const QueueNames = {
  NOTIFICATIONS: 'notifications',
  MEDIA_PROCESSING: 'media-processing',
  SYSTEM_CLEANUP: 'system-cleanup',
  EMAILS: 'emails',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];
