export const QueueNames = {
  NOTIFICATIONS: 'notifications',
  MEDIA_PROCESSING: 'media-processing',
  SYSTEM_CLEANUP: 'system-cleanup',
} as const;

export type QueueName = typeof QueueNames[keyof typeof QueueNames];
