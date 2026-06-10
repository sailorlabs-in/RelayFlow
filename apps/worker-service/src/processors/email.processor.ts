import { QueueNames } from '@chat-app/queues';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import { join } from 'path';

@Processor(QueueNames.EMAILS)
export class EmailProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter!: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  onModuleInit() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.zoho.in');
    const port = this.configService.get<number>('SMTP_PORT', 465);
    const secure = this.configService.get<boolean>('SMTP_SECURE', true);
    const user = this.configService.get<string>(
      'SMTP_USER',
      'service@sailorlabs.in',
    );
    const pass = this.configService.get<string>('SMTP_PASS', 'Z69DGFnj4HRh');

    this.logger.log(
      `Initializing SMTP transporter using user: ${user} on host: ${host}:${port}`,
    );
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  private async renderTemplate(
    templateName: string,
    data: Record<string, any>,
  ): Promise<string> {
    const templatePath = join(
      __dirname,
      'assets',
      'templates',
      `${templateName}.ejs`,
    );
    try {
      this.logger.log(`Rendering email template from: ${templatePath}`);
      return await ejs.renderFile(templatePath, data);
    } catch (error) {
      this.logger.error(
        `❌ Failed to render email template "${templateName}":`,
        error,
      );
      throw error;
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`⚙ Processing job ${job.id} of type "${job.name}"...`);
    const { name, data } = job;

    switch (name) {
      case 'send-verification-email':
        return this.handleSendVerification(data);
      case 'send-2fa-email':
        return this.handleSend2Fa(data);
      case 'send-reset-password-email':
        return this.handleSendResetPassword(data);
      default:
        this.logger.warn(
          `Unknown job name: "${name}" in queue ${QueueNames.EMAILS}`,
        );
        return { success: false, reason: 'unknown job name' };
    }
  }

  private async handleSendVerification(data: {
    email: string;
    displayName: string;
    otp: string;
    expiresAt: string;
  }) {
    const { email, displayName, otp, expiresAt } = data;
    const expiresAtDate = new Date(expiresAt);

    const expiryTime = expiresAtDate.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const html = await this.renderTemplate('verification', {
      displayName,
      otp,
      expiryTime,
    });

    const mailOptions = {
      from: `"RelayFlow" <${this.configService.get<string>('SMTP_USER', 'service@sailorlabs.in')}>`,
      to: email,
      subject: '🔑 Verify Your RelayFlow Account',
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 Verification email sent successfully to ${email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `❌ Failed to send verification email to ${email}:`,
        error,
      );
      throw error;
    }
  }

  private async handleSend2Fa(data: {
    email: string;
    displayName: string;
    otp: string;
  }) {
    const { email, displayName, otp } = data;

    const html = await this.renderTemplate('two-factor', {
      displayName,
      otp,
    });

    const mailOptions = {
      from: `"RelayFlow Security" <${this.configService.get<string>('SMTP_USER', 'service@sailorlabs.in')}>`,
      to: email,
      subject: '🔒 Your RelayFlow 2FA Security Code',
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 2FA email sent successfully to ${email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Failed to send 2FA email to ${email}:`, error);
      throw error;
    }
  }

  private async handleSendResetPassword(data: {
    email: string;
    displayName: string;
    token: string;
  }) {
    const { email, displayName, token } = data;

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:4000',
    );
    const resetLink = `${frontendUrl}?token=${token}`;

    const html = await this.renderTemplate('forgot-password', {
      displayName,
      resetLink,
    });

    const mailOptions = {
      from: `"RelayFlow Help" <${this.configService.get<string>('SMTP_USER', 'service@sailorlabs.in')}>`,
      to: email,
      subject: '🔄 Reset Your RelayFlow Password',
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`📧 Reset password email sent successfully to ${email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `❌ Failed to send reset password email to ${email}:`,
        error,
      );
      throw error;
    }
  }
}
