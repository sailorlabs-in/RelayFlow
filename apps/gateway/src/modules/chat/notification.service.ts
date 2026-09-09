import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initServerClient } from 'vibe-message';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private serverClient: any;

  constructor(private readonly configService: ConfigService) {}

  private getServerClient(): any {
    if (!this.serverClient) {
      const appId =
        this.configService.get<string>('VIBE_APP_ID') ||
        process.env.VIBE_APP_ID;
      const secretKey =
        this.configService.get<string>('VIBE_SECRET_KEY') ||
        process.env.VIBE_SECRET_KEY;

      if (appId && secretKey) {
        this.logger.log(
          'Initializing vibe-message Server Client in Gateway...',
        );
        try {
          this.serverClient = initServerClient({
            appId,
            secretKey,
          });
          this.logger.log(
            'vibe-message Server Client in Gateway initialized successfully.',
          );
        } catch (error) {
          this.logger.error('Failed to initialize vibe-message client', error);
        }
      } else {
        this.logger.warn(
          'vibe-message App ID or Secret Key missing in environment. Notifications will be disabled.',
        );
      }
    }
    return this.serverClient;
  }

  onModuleInit() {
    this.getServerClient();
  }

  async sendPushNotification(
    title: string,
    body: string,
    userIds: string[],
    data?: Record<string, any>,
  ) {
    const client = this.getServerClient();
    if (!client) {
      this.logger.warn(
        'vibe-message is not initialized. Skipping notification.',
      );
      return;
    }

    try {
      this.logger.log(
        `Sending notification via vibe-message to users: ${JSON.stringify(userIds)}`,
      );
      await client.notification({
        notificationData: {
          title,
          body,
          icon: '/logo.png',
          click_action: '/',
          data,
        },
        externalUsers: userIds,
      });
      this.logger.log('Notification sent successfully.');
    } catch (error) {
      this.logger.error(
        'Failed to send notification via vibe-message SDK',
        error,
      );
    }
  }
}
