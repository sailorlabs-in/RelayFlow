import { QueueNames } from '@chat-app/queues';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { initServerClient } from 'vibe-message';

@Processor(QueueNames.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(NotificationProcessor.name);
  private serverClient: any;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  onModuleInit() {
    const appId = this.configService.get<string>('VIBE_APP_ID');
    const secretKey = this.configService.get<string>('VIBE_SECRET_KEY');

    if (appId && secretKey) {
      this.logger.log(
        'Initializing vibe-message Server Client inside Worker...',
      );
      try {
        this.serverClient = initServerClient({
          appId,
          secretKey,
        });
        this.logger.log(
          'vibe-message Server Client inside Worker initialized successfully.',
        );
      } catch (error) {
        this.logger.error(
          'Failed to initialize vibe-message client inside Worker',
          error,
        );
      }
    } else {
      this.logger.warn(
        'vibe-message App ID or Secret Key missing in environment inside Worker. Notifications will be disabled.',
      );
    }
  }

  async process(
    job: Job<
      {
        title: string;
        body: string;
        recipients: string[];
        metadata: any;
        silent?: boolean;
      },
      any,
      string
    >,
  ): Promise<any> {
    this.logger.log(`⚙ Processing job ${job.id} of type "${job.name}"...`);
    const { title, body, recipients, metadata, silent } = job.data;

    this.logger.log(`📱 [PUSH NOTIFICATION SENDING VIA VIBE]
    To: ${recipients.join(', ')}
    Silent: ${!!silent}
    Title: "${title}"
    Body: "${body}"
    Metadata: ${JSON.stringify(metadata)}`);

    if (!this.serverClient) {
      this.logger.warn(
        'vibe-message is not initialized. Skipping notification.',
      );
      return { success: false, reason: 'vibe-message not initialized' };
    }

    const notificationData: any = {
      data: metadata,
    };

    if (silent) {
      notificationData.silent = true;
    } else {
      notificationData.title = title;
      notificationData.body = body;
      notificationData.icon = '/logo.png';
      notificationData.click_action = '/';
    }

    try {
      await this.serverClient.notification({
        notificationData,
        externalUsers: recipients,
      });
      this.logger.log('vibe-message Notification sent successfully.');
      return { success: true, processedAt: new Date().toISOString() };
    } catch (error) {
      this.logger.error(
        'Failed to send notification via vibe-message SDK',
        error,
      );
      throw error;
    }
  }
}
