import { QueueNames } from '@chat-app/queues';
import {
  User,
  Conversation,
  ConversationMember,
  ConversationType,
  Message,
} from '@chat-app/database';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import { Repository, LessThan, In } from 'typeorm';
import { deleteBucketMedia } from '../utils/bucket-storage.util';

@Processor(QueueNames.SYSTEM_CLEANUP)
export class SystemCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(SystemCleanupProcessor.name);

  constructor(
    @InjectQueue(QueueNames.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    @InjectQueue(QueueNames.EMAILS)
    private readonly emailsQueue: Queue,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly conversationMemberRepository: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(
      `⚙ [System Cleanup] Executing job "${job.name}" (ID: ${job.id})...`,
    );

    switch (job.name) {
      case 'unverified-users-cleanup':
        return this.cleanupUnverifiedUsers();
      case 'dm-retention-cleanup':
        return this.cleanupDmRetention();
      case 'midnight-queue-cleanup':
      default:
        return this.cleanupQueues();
    }
  }

  private async cleanupUnverifiedUsers(): Promise<{ affected: number }> {
    try {
      this.logger.log(
        '⚙ [BullMQ Cron] Running cleanup for expired unverified accounts (24h limit)...',
      );
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const result = await this.userRepository.delete({
        isVerified: false,
        createdAt: LessThan(cutoff),
      });

      const affected = result.affected || 0;
      if (affected > 0) {
        this.logger.log(`🗑 Removed ${affected} expired unverified accounts.`);
      } else {
        this.logger.log('✔ No expired unverified accounts found.');
      }
      return { affected };
    } catch (error) {
      this.logger.error('❌ Failed to run unverified users cleanup:', error);
      throw error;
    }
  }

  private async cleanupQueues(): Promise<any> {
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

  /**
   * 1-on-1 Direct Conversation Auto-Deletion & Media Retention Sweeper
   * Applies the "larger duration wins" rule between conversation participants.
   * Purges expired messages (along with their media & thumbnails) and
   * purges expired main media files (preserving preview thumbnails).
   */
  private async cleanupDmRetention(): Promise<{
    conversationsScanned: number;
    messagesPurged: number;
    mediaPurged: number;
  }> {
    this.logger.log(
      '🧹 [BullMQ Cron] Running 1-on-1 DM retention & auto-deletion cleanup...',
    );

    const bucketUrl = this.configService.get<string>(
      'BUCKET_URL',
      'https://bucket.umangsailor.com',
    );

    let totalMessagesPurged = 0;
    let totalMediaPurged = 0;

    try {
      const dmConversations = await this.conversationRepository.find({
        where: { type: ConversationType.DM },
      });

      this.logger.log(
        `🔍 [DM Retention] Found ${dmConversations.length} 1-on-1 conversation(s) to evaluate.`,
      );

      for (const convo of dmConversations) {
        // Fetch participants
        const memberships = await this.conversationMemberRepository.find({
          where: { conversationId: convo.id },
        });

        if (memberships.length === 0) {
          continue;
        }

        const userIds = memberships.map((m) => m.userId);
        const users = await this.userRepository.find({
          where: { id: In(userIds) },
        });

        const userA = users[0];
        const userB = users[1] || users[0]; // In case of self-chat

        const mediaDaysA = userA?.retentionMediaDays ?? 30;
        const mediaDaysB = userB?.retentionMediaDays ?? 30;

        // 0 represents Infinity (Never delete)
        const effectiveMediaDays =
          mediaDaysA === 0 || mediaDaysB === 0
            ? null
            : Math.max(mediaDaysA, mediaDaysB);

        const msgDaysA = userA?.retentionMessageDays ?? 90;
        const msgDaysB = userB?.retentionMessageDays ?? 90;

        const effectiveMsgDays =
          msgDaysA === 0 || msgDaysB === 0
            ? null
            : Math.max(msgDaysA, msgDaysB);

        // ─────────────────────────────────────────────────────────────
        // Step A: Message History Purge (Older than effectiveMsgDays)
        // Permanently destroys message record + BOTH full media and thumbnails
        // ─────────────────────────────────────────────────────────────
        if (effectiveMsgDays !== null) {
          const msgCutoff = new Date(
            Date.now() - effectiveMsgDays * 24 * 60 * 60 * 1000,
          );

          const expiredMessages = await this.messageRepository.find({
            where: {
              conversationId: convo.id,
              createdAt: LessThan(msgCutoff),
            },
          });

          if (expiredMessages.length > 0) {
            const urlsToDelete: string[] = [];
            for (const msg of expiredMessages) {
              if (msg.media && Array.isArray(msg.media)) {
                for (const item of msg.media) {
                  if (item.url) {
                    urlsToDelete.push(item.url);
                  }
                  if (item.thumbnailUrl) {
                    urlsToDelete.push(item.thumbnailUrl);
                  }
                }
              }
            }

            if (urlsToDelete.length > 0) {
              await deleteBucketMedia(urlsToDelete, bucketUrl);
            }

            const expiredIds = expiredMessages.map((m) => m.id);
            await this.messageRepository.delete({ id: In(expiredIds) });
            totalMessagesPurged += expiredMessages.length;

            this.logger.log(
              `💬 [DM Retention] Removed ${expiredMessages.length} message(s) from conversation ${convo.id} (Threshold: ${effectiveMsgDays} days).`,
            );
          }
        }

        // ─────────────────────────────────────────────────────────────
        // Step B: High-Resolution Media Purge (Older than effectiveMediaDays)
        // Deletes ONLY main media from storage; PRESERVES thumbnails!
        // ─────────────────────────────────────────────────────────────
        if (effectiveMediaDays !== null) {
          const mediaCutoff = new Date(
            Date.now() - effectiveMediaDays * 24 * 60 * 60 * 1000,
          );

          const candidateMessages = await this.messageRepository.find({
            where: {
              conversationId: convo.id,
              createdAt: LessThan(mediaCutoff),
            },
          });

          for (const msg of candidateMessages) {
            if (!msg.media || !Array.isArray(msg.media)) {
              continue;
            }

            const mainUrlsToDelete: string[] = [];
            let updated = false;

            for (const item of msg.media) {
              if (item.url && !item.isExpired) {
                mainUrlsToDelete.push(item.url);
                item.isExpired = true;
                updated = true;
              }
            }

            if (updated) {
              await this.messageRepository.save(msg);
              if (mainUrlsToDelete.length > 0) {
                await deleteBucketMedia(mainUrlsToDelete, bucketUrl);
                totalMediaPurged += mainUrlsToDelete.length;
              }
            }
          }
        }
      }

      this.logger.log(
        `✔ [DM Retention] Finished sweep. Total messages purged: ${totalMessagesPurged}, main media purged: ${totalMediaPurged}.`,
      );

      return {
        conversationsScanned: dmConversations.length,
        messagesPurged: totalMessagesPurged,
        mediaPurged: totalMediaPurged,
      };
    } catch (error) {
      this.logger.error(
        '❌ [DM Retention] Failed to execute 1-on-1 retention sweep:',
        error,
      );
      throw error;
    }
  }
}
