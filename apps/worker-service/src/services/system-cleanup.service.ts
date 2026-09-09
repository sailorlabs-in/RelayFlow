import { QueueNames } from '@chat-app/queues';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class SystemCleanupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemCleanupService.name);

  constructor(
    @InjectQueue(QueueNames.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    @InjectQueue(QueueNames.EMAILS)
    private readonly emailsQueue: Queue,
    @InjectQueue(QueueNames.SYSTEM_CLEANUP)
    private readonly systemCleanupQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.runStartupPurge();
    await this.registerMidnightCleanupSchedule();
    await this.registerUnverifiedUsersCleanupSchedule();
    await this.registerDmRetentionCleanupSchedule();
  }

  /**
   * Immediately purges any completed backlog jobs currently sitting in Redis
   */
  async runStartupPurge(): Promise<void> {
    this.logger.log(
      '🧹 [Startup Cleanup] Scanning Redis for stale completed/failed queue jobs...',
    );

    try {
      // 1. Clean completed notification jobs (0 grace period = all completed)
      const cleanedNotifCompleted = await this.notificationsQueue.clean(
        0,
        0,
        'completed',
      );
      const cleanedNotifFailed = await this.notificationsQueue.clean(
        7 * 24 * 3600 * 1000,
        0,
        'failed',
      );
      await this.notificationsQueue.trimEvents(100);

      // 2. Clean completed email jobs
      const cleanedEmailsCompleted = await this.emailsQueue.clean(
        0,
        0,
        'completed',
      );
      const cleanedEmailsFailed = await this.emailsQueue.clean(
        7 * 24 * 3600 * 1000,
        0,
        'failed',
      );
      await this.emailsQueue.trimEvents(100);

      this.logger.log(
        `🧹 [Startup Cleanup] Initial purge complete: Deleted ${cleanedNotifCompleted.length} completed & ${cleanedNotifFailed.length} failed notification keys, ${cleanedEmailsCompleted.length} completed & ${cleanedEmailsFailed.length} failed email keys from Redis.`,
      );
    } catch (error) {
      this.logger.error(
        '❌ [Startup Cleanup] Failed to run initial queue purge:',
        error,
      );
    }
  }

  /**
   * Schedules a recurring BullMQ repeatable job to run midnight cleanup
   */
  async registerMidnightCleanupSchedule(): Promise<void> {
    const cronPattern = this.configService.get<string>(
      'QUEUE_CLEANUP_CRON',
      '0 0 * * *', // Default: Every day at midnight (00:00:00)
    );

    try {
      // Check existing repeatable jobs to prevent duplicate registrations
      const repeatableJobs = await this.systemCleanupQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) =>
          job.name === 'midnight-queue-cleanup' ||
          job.key?.includes('midnight-queue-cleanup'),
      );

      if (existingJob) {
        this.logger.log(
          `⏱ [Scheduler] Midnight queue cleanup schedule already active (Pattern: "${existingJob.pattern || cronPattern}").`,
        );
        return;
      }

      await this.systemCleanupQueue.add(
        'midnight-queue-cleanup',
        {},
        {
          repeat: {
            pattern: cronPattern,
          },
          jobId: 'midnight-queue-cleanup',
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      this.logger.log(
        `⏱ [Scheduler] Successfully registered recurring midnight queue cleanup (Cron: "${cronPattern}").`,
      );
    } catch (error) {
      this.logger.error(
        '❌ [Scheduler] Failed to register midnight cleanup schedule:',
        error,
      );
    }
  }

  /**
   * Schedules an hourly BullMQ repeatable job to purge unverified user accounts
   */
  async registerUnverifiedUsersCleanupSchedule(): Promise<void> {
    const cronPattern = this.configService.get<string>(
      'UNVERIFIED_USERS_CLEANUP_CRON',
      '0 * * * *', // Default: Every hour on the hour
    );

    try {
      const repeatableJobs = await this.systemCleanupQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) =>
          job.name === 'unverified-users-cleanup' ||
          job.key?.includes('unverified-users-cleanup'),
      );

      if (existingJob) {
        this.logger.log(
          `⏱ [Scheduler] Unverified users cleanup schedule already active (Pattern: "${existingJob.pattern || cronPattern}").`,
        );
        return;
      }

      await this.systemCleanupQueue.add(
        'unverified-users-cleanup',
        {},
        {
          repeat: {
            pattern: cronPattern,
          },
          jobId: 'unverified-users-cleanup',
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      this.logger.log(
        `⏱ [Scheduler] Successfully registered recurring unverified users cleanup (Cron: "${cronPattern}").`,
      );
    } catch (error) {
      this.logger.error(
        '❌ [Scheduler] Failed to register unverified users cleanup schedule:',
        error,
      );
    }
  }

  /**
   * Schedules a daily BullMQ repeatable job for 1-on-1 direct conversation retention & auto-deletion
   */
  async registerDmRetentionCleanupSchedule(): Promise<void> {
    const cronPattern = this.configService.get<string>(
      'DM_RETENTION_CLEANUP_CRON',
      '0 4 * * *', // Default: Daily at 4:00 AM
    );

    try {
      const repeatableJobs = await this.systemCleanupQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        (job) =>
          job.name === 'dm-retention-cleanup' ||
          job.key?.includes('dm-retention-cleanup'),
      );

      if (existingJob) {
        this.logger.log(
          `⏱ [Scheduler] 1-on-1 DM retention cleanup schedule already active (Pattern: "${existingJob.pattern || cronPattern}").`,
        );
        return;
      }

      await this.systemCleanupQueue.add(
        'dm-retention-cleanup',
        {},
        {
          repeat: {
            pattern: cronPattern,
          },
          jobId: 'dm-retention-cleanup',
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      this.logger.log(
        `⏱ [Scheduler] Successfully registered recurring 1-on-1 DM retention cleanup (Cron: "${cronPattern}").`,
      );
    } catch (error) {
      this.logger.error(
        '❌ [Scheduler] Failed to register DM retention cleanup schedule:',
        error,
      );
    }
  }
}
