import { User } from '@chat-app/database';
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { CryptoUtil } from './crypto.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(
    email: string,
    password: string,
    displayName?: string,
    username?: string,
  ): Promise<User> {
    const passwordHash = CryptoUtil.hashPassword(password);
    const user = await this.usersService.create(
      email,
      passwordHash,
      displayName,
      username,
    );

    // Generate 6-digit OTP code for verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Save OTP to DB
    await this.usersService.updateVerificationOtp(user.id, otp, expiresAt);

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.displayName || user.email.split('@')[0],
        otp,
        expiresAt,
      );
    } catch (error) {
      // Log the error but don't fail registration
      console.error('Failed to send verification email on register:', error);
    }

    return user;
  }

  async login(
    email: string,
    password: string,
    deviceId?: string,
  ): Promise<{
    accessToken?: string;
    user?: User;
    requiresVerification?: boolean;
    requires2FA?: boolean;
    userId?: string;
    email?: string;
  }> {
    const user = await this.usersService.findByEmailOrUsername(email);
    if (!user) {
      throw new UnauthorizedException('❌ Invalid email/username or password');
    }

    const isMatch = CryptoUtil.verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('❌ Invalid email/username or password');
    }

    // 1) Verify account verification state
    if (!user.isVerified) {
      const isExpired =
        Date.now() - new Date(user.createdAt).getTime() > 24 * 60 * 60 * 1000;
      if (isExpired) {
        // Delete user
        await this.usersService.deleteUser(user.id);
        throw new UnauthorizedException(
          '❌ Account verification expired. The unverified account has been removed. Please sign up again.',
        );
      }

      return {
        requiresVerification: true,
        email: user.email,
      };
    }

    // 2) Verify Two-Factor Authentication state
    if (user.isTwoFactorEnabled) {
      let bypass2FA = false;

      if (user.twoFactorOnlyNewDevice && deviceId) {
        let remembered: string[] = [];
        if (user.rememberedDevices) {
          try {
            remembered = JSON.parse(user.rememberedDevices);
            if (!Array.isArray(remembered)) {
              remembered = [];
            }
          } catch {
            remembered = [];
          }
        }
        if (remembered.includes(deviceId)) {
          bypass2FA = true;
        }
      }

      if (!bypass2FA) {
        // Generate 6-digit OTP code for 2FA
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

        // Save 2FA OTP to DB
        await this.usersService.updateTwoFactorOtp(user.id, otp, expiresAt);

        // Send 2FA email
        try {
          await this.emailService.sendTwoFactorEmail(
            user.email,
            user.displayName || user.email.split('@')[0],
            otp,
          );
        } catch (error) {
          console.error('Failed to send 2FA email on login:', error);
        }

        return {
          requires2FA: true,
          userId: user.id,
          email: user.email,
        };
      }
    }

    // Normal successful login
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async verifyEmail(
    email: string,
    otp: string,
  ): Promise<{ accessToken: string; user: User }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('❌ User not found');
    }

    if (user.isVerified) {
      // Already verified, just log them in
      const payload = { sub: user.id, email: user.email };
      const accessToken = this.jwtService.sign(payload);
      return { accessToken, user };
    }

    // Check expiry
    const storedOtp = await this.usersService.getVerificationOtp(user.id);
    if (!storedOtp) {
      // Delete user
      await this.usersService.deleteUser(user.id);
      throw new BadRequestException(
        '❌ Verification code expired. Account has been deleted. Please register again.',
      );
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('❌ Invalid verification code');
    }

    const verifiedUser = await this.usersService.verifyUserEmail(user.id);
    const payload = { sub: verifiedUser.id, email: verifiedUser.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: verifiedUser,
    };
  }

  async resendVerification(email: string): Promise<{ success: boolean }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('❌ User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('❌ Email is already verified');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.usersService.updateVerificationOtp(user.id, otp, expiresAt);

    await this.emailService.sendVerificationEmail(
      user.email,
      user.displayName || user.email.split('@')[0],
      otp,
      expiresAt,
    );

    return { success: true };
  }

  async verify2Fa(
    userId: string,
    otp: string,
    deviceId?: string,
    rememberDevice?: boolean,
  ): Promise<{ accessToken: string; user: User }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('❌ User not found');
    }

    // Check expiry
    const storedOtp = await this.usersService.getTwoFactorOtp(user.id);
    if (!storedOtp) {
      throw new BadRequestException(
        '❌ 2FA code expired. Please log in again.',
      );
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('❌ Invalid 2FA code');
    }

    // Clear OTP
    await this.usersService.clearTwoFactorOtp(user.id);

    // Save device if remember is checked
    let updatedUser = user;
    if (rememberDevice && deviceId) {
      updatedUser = await this.usersService.addRememberedDevice(
        user.id,
        deviceId,
      );
    }

    const payload = { sub: updatedUser.id, email: updatedUser.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: updatedUser,
    };
  }

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Return success anyway for security reasons (prevents email harvesting)
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await this.usersService.updateResetPasswordToken(user.id, token, expiresAt);

    try {
      await this.emailService.sendResetPasswordEmail(
        user.email,
        user.displayName || user.email.split('@')[0],
        token,
      );
    } catch (error) {
      console.error('Failed to send reset password email:', error);
    }

    return { success: true };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ success: boolean }> {
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('❌ Invalid or expired reset link');
    }

    const isExpired =
      !user.resetPasswordExpiresAt ||
      new Date() > new Date(user.resetPasswordExpiresAt);
    if (isExpired) {
      throw new BadRequestException(
        '❌ Reset link has expired. Please request a new one.',
      );
    }

    const passwordHash = CryptoUtil.hashPassword(password);
    await this.usersService.resetUserPassword(user.id, passwordHash);

    return { success: true };
  }

  async validateToken(
    token: string,
  ): Promise<{ userId: string; email: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return { userId: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('❌ Invalid or expired token');
    }
  }
}
