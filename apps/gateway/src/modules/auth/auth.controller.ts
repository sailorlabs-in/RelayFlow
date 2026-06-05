import { User } from '@chat-app/database';
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
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
    summary: 'Authenticate user credentials and issue JWT access token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'superpassword123' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
        user: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ): Promise<{ accessToken: string; user: User }> {
    return this.authService.login(email, password);
  }
}
