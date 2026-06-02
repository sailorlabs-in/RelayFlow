import { User } from '@chat-app/database';
import { Controller, Get, Query, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for active users by email or display name' })
  @ApiQuery({ name: 'query', required: true, description: 'Search query string' })
  @ApiResponse({ status: 200, description: 'List of matching users.', type: [User] })
  async search(@Query('query') query: string): Promise<User[]> {
    return this.usersService.search(query || '');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Authenticated user profile details.', type: User })
  async getMe(@CurrentUser() currentUser: { userId: string }): Promise<User> {
    return this.usersService.findById(currentUser.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile settings' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', example: 'Umang' },
        password: { type: 'string', example: 'newsecurepassword123' },
        themeMode: { type: 'string', example: 'dark' },
        themeSchema: { type: 'string', example: 'emerald' },
        status: { type: 'string', example: 'away' },
        visibility: { type: 'string', example: 'everyone' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Updated user profile.', type: User })
  async updateProfile(
    @CurrentUser() currentUser: { userId: string },
    @Body() body: {
      displayName?: string;
      password?: string;
      themeMode?: string;
      themeSchema?: string;
      status?: string;
      visibility?: string;
    }
  ): Promise<User> {
    return this.usersService.updateProfile(currentUser.userId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by UUID' })
  @ApiParam({ name: 'id', description: 'User unique UUID' })
  @ApiResponse({ status: 200, description: 'User profile details.', type: User })
  async findById(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }
}
