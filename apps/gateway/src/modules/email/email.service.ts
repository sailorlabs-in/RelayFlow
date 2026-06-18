import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueNames } from '@chat-app/queues';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue(QueueNames.EMAILS)
    private readonly emailsQueue: Queue,
  ) {}

  async sendVerificationEmail(
    email: string,
    displayName: string,
    otp: string,
    expiresAt: Date,
  ) {
    this.logger.log(`⚡ Queueing verification email to ${email}`);
    try {
      await this.emailsQueue.add('send-verification-email', {
        email,
        displayName,
        otp,
        expiresAt: expiresAt.toISOString(),
      });
      this.logger.log(`✅ Verification email queued for ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to queue verification email for ${email}:`,
        error,
      );
      throw error;
    }
  }

  async sendTwoFactorEmail(email: string, displayName: string, otp: string) {
    this.logger.log(`⚡ Queueing 2FA email to ${email}`);
    try {
      await this.emailsQueue.add('send-2fa-email', {
        email,
        displayName,
        otp,
      });
      this.logger.log(`✅ 2FA email queued for ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to queue 2FA email for ${email}:`, error);
      throw error;
    }
  }

  async sendResetPasswordEmail(
    email: string,
    displayName: string,
    token: string,
  ) {
    this.logger.log(`⚡ Queueing reset password email to ${email}`);
    try {
      await this.emailsQueue.add('send-reset-password-email', {
        email,
        displayName,
        token,
      });
      this.logger.log(`✅ Reset password email queued for ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to queue reset password email for ${email}:`,
        error,
      );
      throw error;
    }
  }

  async sendOwnershipTransferEmail(
    email: string,
    displayName: string,
    groupName: string,
    token: string,
  ) {
    this.logger.log(`⚡ Queueing ownership transfer email to ${email}`);
    try {
      await this.emailsQueue.add('send-ownership-transfer-email', {
        email,
        displayName,
        groupName,
        token,
      });
      this.logger.log(`✅ Ownership transfer email queued for ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to queue ownership transfer email for ${email}:`,
        error,
      );
      throw error;
    }
  }
}
