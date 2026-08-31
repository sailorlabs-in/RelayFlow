import { QueueNames } from '@chat-app/queues';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

@Processor(QueueNames.SYSTEM_CLEANUP)
export class SystemCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(SystemCleanupProcessor.name);

  constructor(
    @InjectQueue(QueueNames.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    @InjectQueue(QueueNames.EMAILS)
    private readonly emailsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(
      `⚙ [Midnight Queue Cleanup] Executing job "${job.name}" (ID: ${job.id})...`,
    );

    try {
      // 1. Purge completed notification jobs (0 grace period = all completed)
      const cleanedNotifCompleted = await this.notificationsQueue.clean(
        0,
        0,
        'completed',
      );
      // 2. Purge failed notification jobs older than 7 days
      const cleanedNotifFailed = await this.notificationsQueue.clean(
        7 * 24 * 3600 * 1000,
        0,
        'failed',
      );
      // 3. Trim events stream to keep Redis memory minimal
      await this.notificationsQueue.trimEvents(100);

      // 4. Purge completed email jobs
      const cleanedEmailsCompleted = await this.emailsQueue.clean(
        0,
        0,
        'completed',
      );
      // 5. Purge failed email jobs older than 7 days
      const cleanedEmailsFailed = await this.emailsQueue.clean(
        7 * 24 * 3600 * 1000,
        0,
        'failed',
      );
      await this.emailsQueue.trimEvents(100);

      const result = {
        timestamp: new Date().toISOString(),
        notifications: {
          completedPurged: cleanedNotifCompleted.length,
          failedPurged: cleanedNotifFailed.length,
        },
        emails: {
          completedPurged: cleanedEmailsCompleted.length,
          failedPurged: cleanedEmailsFailed.length,
        },
      };

      this.logger.log(
        `✔ [Midnight Queue Cleanup] Summary: Removed ${cleanedNotifCompleted.length} completed & ${cleanedNotifFailed.length} failed notification jobs, ${cleanedEmailsCompleted.length} completed & ${cleanedEmailsFailed.length} failed email jobs from Redis.`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        '❌ [Midnight Queue Cleanup] Error during queue cleanup:',
        error,
      );
      throw error;
    }
  }
}
