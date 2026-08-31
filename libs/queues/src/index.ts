export const QueueNames = {
  NOTIFICATIONS: 'notifications',
  MEDIA_PROCESSING: 'media-processing',
  SYSTEM_CLEANUP: 'system-cleanup',
  EMAILS: 'emails',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

export const DEFAULT_QUEUE_JOB_OPTIONS = {
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for max 24 hours
    count: 500, // Keep at most 500 completed jobs in Redis
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for up to 7 days
    count: 1000,
  },
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
};
