import { User } from '@chat-app/database';
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user profile' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'username'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'superpassword123' },
        username: { type: 'string', example: 'umang' },
        displayName: { type: 'string', example: 'Umang' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered.',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Invalid input payload.' })
  @ApiResponse({
    status: 409,
    description: 'Email/Username is already registered.',
  })
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('username') username: string,
    @Body('displayName') displayName?: string,
  ): Promise<User> {
    return this.authService.register(email, password, displayName, username);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Authenticate user credentials and issue JWT access token, or return verification check status',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'superpassword123' },
        deviceId: { type: 'string', example: 'client-device-uuid-1234' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'User successfully authenticated or checkpoint triggers (requiresVerification / requires2FA).',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('deviceId') deviceId?: string,
    @Req() req?: any,
  ): Promise<any> {
    const userAgent = req?.headers['user-agent'] || 'Unknown';
    const ip = req?.ip || 'Unknown';
    return this.authService.login(email, password, deviceId, userAgent, ip);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify account email with OTP code' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'otp'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        otp: { type: 'string', example: '123456' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  async verifyEmail(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Body('deviceId') deviceId?: string,
    @Req() req?: any,
  ): Promise<any> {
    const userAgent = req?.headers['user-agent'] || 'Unknown';
    const ip = req?.ip || 'Unknown';
    return this.authService.verifyEmail(email, otp, deviceId, userAgent, ip);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  })
  async resendVerification(@Body('email') email: string): Promise<any> {
    return this.authService.resendVerification(email);
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA login OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'otp'],
      properties: {
        userId: { type: 'string', example: 'user-uuid-1234' },
        otp: { type: 'string', example: '123456' },
        deviceId: { type: 'string', example: 'client-device-uuid-1234' },
        rememberDevice: { type: 'boolean', example: true },
      },
    },
  })
  async verify2Fa(
    @Body('userId') userId: string,
    @Body('otp') otp: string,
    @Body('deviceId') deviceId?: string,
    @Body('rememberDevice') rememberDevice?: boolean,
    @Req() req?: any,
  ): Promise<any> {
    const userAgent = req?.headers['user-agent'] || 'Unknown';
    const ip = req?.ip || 'Unknown';
    return this.authService.verify2Fa(
      userId,
      otp,
      deviceId,
      rememberDevice,
      userAgent,
      ip,
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
    },
  })
  async forgotPassword(@Body('email') email: string): Promise<any> {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset account password with token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'password'],
      properties: {
        token: { type: 'string', example: 'token-string' },
        password: { type: 'string', example: 'newsecurepassword123' },
      },
    },
  })
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ): Promise<any> {
    return this.authService.resetPassword(token, password);
  }
}
