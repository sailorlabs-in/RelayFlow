import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import { join } from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
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
    // Webpack copies assets to dist/assets, main.js is at dist/main.js.
    // So __dirname will be d:\Workspace\POCS\chat-app\apps\gateway\dist
    const templatePath = join(
      __dirname,
      'assets',
      'templates',
      `${templateName}.ejs`,
    );
    try {
      return await ejs.renderFile(templatePath, data);
    } catch (error) {
      this.logger.error(
        `❌ Failed to render email template "${templateName}":`,
        error,
      );
      throw error;
    }
  }

  async sendVerificationEmail(
    email: string,
    displayName: string,
    otp: string,
    expiresAt: Date,
  ) {
    const expiryTime = expiresAt.toLocaleString('en-US', {
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
      this.logger.log(`📧 Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send verification email to ${email}:`,
        error,
      );
      throw error;
    }
  }

  async sendTwoFactorEmail(email: string, displayName: string, otp: string) {
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
      this.logger.log(`📧 2FA email sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send 2FA email to ${email}:`, error);
      throw error;
    }
  }

  async sendResetPasswordEmail(
    email: string,
    displayName: string,
    token: string,
  ) {
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
      this.logger.log(`📧 Reset password email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send reset password email to ${email}:`,
        error,
      );
      throw error;
    }
  }
}
