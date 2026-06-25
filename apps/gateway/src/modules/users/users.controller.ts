import { User } from '@chat-app/database';
import {
  Controller,
  Get,
  Query,
  Param,
  Patch,
  Body,
  UseGuards,
  Post,
  Delete,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueNames } from '@chat-app/queues';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { UsersService } from './users.service';
import { FriendSearchResponseDto } from './dto/friend-search-response.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtimeGateway: RealtimeGateway,
    @InjectQueue(QueueNames.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for active users by email or display name' })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Search query string',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching users.',
    type: [User],
  })
  async search(@Query('query') query: string): Promise<User[]> {
    return this.usersService.search(query || '');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Authenticated user profile details.',
    type: User,
  })
  async getMe(@CurrentUser() currentUser: { userId: string }): Promise<User> {
    return this.usersService.findById(currentUser.userId);
  }

  @Get('check-username')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if a username is available' })
  @ApiQuery({
    name: 'username',
    required: true,
    description: 'Username to check',
  })
  async checkUsername(
    @Query('username') username: string,
    @CurrentUser() currentUser: { userId: string },
  ): Promise<{ available: boolean }> {
    const available = await this.usersService.isUsernameAvailable(
      username,
      currentUser.userId,
    );
    return { available };
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
        username: { type: 'string', example: 'umang' },
        password: { type: 'string', example: 'newsecurepassword123' },
        themeMode: { type: 'string', example: 'dark' },
        themeSchema: { type: 'string', example: 'emerald' },
        status: { type: 'string', example: 'away' },
        visibility: { type: 'string', example: 'everyone' },
        notificationsEnabled: { type: 'boolean', example: true },
        notificationsDmEnabled: { type: 'boolean', example: true },
        notificationsGroupEnabled: { type: 'boolean', example: true },
        notificationsInAppEnabled: { type: 'boolean', example: true },
        notificationsFriendRequestEnabled: { type: 'boolean', example: true },
        isTwoFactorEnabled: { type: 'boolean', example: true },
        twoFactorOnlyNewDevice: { type: 'boolean', example: false },
        avatarUrl: {
          type: 'string',
          example: 'https://bucket.umangsailor.com/storage/profiles/avatar.png',
        },
        avatarThumbnailUrl: {
          type: 'string',
          example:
            'https://bucket.umangsailor.com/storage/profiles/avatar_thumb.png',
        },
        groupOrder: {
          type: 'string',
          example: '["group-id-1", "group-id-2"]',
        },
        customThemes: {
          type: 'string',
          example: '[]',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Updated user profile.',
    type: User,
  })
  async updateProfile(
    @CurrentUser() currentUser: { userId: string },
    @Body()
    body: {
      displayName?: string;
      username?: string;
      password?: string;
      themeMode?: string;
      themeSchema?: string;
      status?: string;
      visibility?: string;
      notificationsEnabled?: boolean;
      notificationsDmEnabled?: boolean;
      notificationsGroupEnabled?: boolean;
      groupNotificationPref?: 'all' | 'mention' | 'none';
      notificationsInAppEnabled?: boolean;
      notificationsFriendRequestEnabled?: boolean;
      isTwoFactorEnabled?: boolean;
      twoFactorOnlyNewDevice?: boolean;
      avatarUrl?: string;
      avatarThumbnailUrl?: string;
      groupOrder?: string;
      customThemes?: string;
    },
  ): Promise<User> {
    return this.usersService.updateProfile(currentUser.userId, body);
  }

  @Get('search-friend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search for email or username match to add as a friend',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Email or username search query',
  })
  @ApiResponse({
    status: 200,
    description: 'Found users profile.',
    type: [FriendSearchResponseDto],
  })
  async searchFriend(
    @Query('query') query: string,
    @CurrentUser() currentUser: { userId: string },
  ): Promise<FriendSearchResponseDto[]> {
    this.logger.debug(`searchFriend: query='${query}' (type: ${typeof query})`);
    const users = await this.usersService.searchFriend(
      query,
      currentUser.userId,
    );
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      avatarThumbnailUrl: u.avatarThumbnailUrl,
      status: u.status,
    }));
  }

  @Post('friends/request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a friend request by email or username' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['emailOrUsername'],
      properties: {
        emailOrUsername: { type: 'string', example: 'friend@example.com' },
      },
    },
  })
  async sendFriendRequest(
    @Body('emailOrUsername') emailOrUsername: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    const friendship = await this.usersService.sendFriendRequest(
      currentUser.userId,
      emailOrUsername,
    );

    if (friendship.status === 'accepted') {
      this.realtimeGateway.server
        .to(`user:${friendship.requesterId}`)
        .emit('friend.request.accepted', friendship);
      this.realtimeGateway.server
        .to(`user:${friendship.addresseeId}`)
        .emit('friend.request.accepted', friendship);
    } else {
      this.realtimeGateway.server
        .to(`user:${friendship.addresseeId}`)
        .emit('friend.request.received', friendship);

      // Queue push notification for received friend request
      try {
        const addressee = friendship.addressee;
        if (
          addressee &&
          addressee.notificationsEnabled !== false &&
          addressee.notificationsFriendRequestEnabled !== false
        ) {
          const requester = friendship.requester;
          const senderName =
            requester?.displayName ||
            requester?.email?.split('@')[0] ||
            'Someone';

          let devices: any[] = [];
          if (addressee.loggedInDevices) {
            try {
              devices = JSON.parse(addressee.loggedInDevices);
            } catch {
              devices = [];
            }
          }

          const recipientsToNotify: string[] = [];
          if (Array.isArray(devices) && devices.length > 0) {
            const activeDevices = devices.filter(
              (d: any) => d.notificationsEnabled !== false,
            );
            for (const d of activeDevices) {
              recipientsToNotify.push(`${addressee.id}:${d.deviceId}`);
            }
          } else {
            recipientsToNotify.push(friendship.addresseeId);
          }

          if (recipientsToNotify.length > 0) {
            await this.notificationsQueue.add('send-push', {
              title: 'New Friend Request',
              body: `${senderName} sent you a friend request!`,
              recipients: recipientsToNotify,
              metadata: {
                type: 'friend_request',
                requestId: friendship.id,
                senderId: friendship.requesterId,
                senderName,
              },
            });
          }
        }
      } catch (err) {
        this.logger.error('Failed to queue friend request notification', err);
      }
    }

    return friendship;
  }

  @Get('friends/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all pending friend requests' })
  async getPendingRequests(@CurrentUser() currentUser: { userId: string }) {
    return this.usersService.getPendingRequests(currentUser.userId);
  }

  @Post('friends/requests/:id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a friend request' })
  @ApiParam({ name: 'id', description: 'Friend request ID' })
  async acceptFriendRequest(
    @Param('id') id: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    const friendship = await this.usersService.acceptFriendRequest(
      currentUser.userId,
      id,
    );

    this.realtimeGateway.server
      .to(`user:${friendship.requesterId}`)
      .emit('friend.request.accepted', friendship);
    this.realtimeGateway.server
      .to(`user:${friendship.addresseeId}`)
      .emit('friend.request.accepted', friendship);

    return friendship;
  }

  @Post('friends/requests/:id/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Decline a friend request' })
  @ApiParam({ name: 'id', description: 'Friend request ID' })
  async declineFriendRequest(
    @Param('id') id: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    const friendship = await this.usersService.declineFriendRequest(
      currentUser.userId,
      id,
    );

    this.realtimeGateway.server
      .to(`user:${friendship.requesterId}`)
      .emit('friend.request.declined', { id });
    this.realtimeGateway.server
      .to(`user:${friendship.addresseeId}`)
      .emit('friend.request.declined', { id });

    return { success: true };
  }

  @Get('friends')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get accepted friends list' })
  async getFriends(@CurrentUser() currentUser: { userId: string }) {
    return this.usersService.listFriends(currentUser.userId);
  }

  @Delete('friends/:friendId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a friend' })
  @ApiParam({ name: 'friendId', description: 'Friend User ID' })
  async removeFriend(
    @Param('friendId') friendId: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    await this.usersService.removeFriend(currentUser.userId, friendId);

    this.realtimeGateway.server
      .to(`user:${currentUser.userId}`)
      .emit('friend.removed', { friendId });
    this.realtimeGateway.server
      .to(`user:${friendId}`)
      .emit('friend.removed', { friendId: currentUser.userId });

    return { success: true };
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of logged-in devices' })
  async getDevices(
    @CurrentUser() currentUser: { userId: string },
  ): Promise<any[]> {
    const user = await this.usersService.findById(currentUser.userId);
    if (!user.loggedInDevices) {
      return [];
    }
    try {
      const parsed = JSON.parse(user.loggedInDevices);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  @Post('devices/:deviceId/logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out from a specific device' })
  async logoutDevice(
    @CurrentUser() currentUser: { userId: string },
    @Param('deviceId') deviceId: string,
  ): Promise<any> {
    await this.usersService.logoutDevice(currentUser.userId, deviceId);
    await this.realtimeGateway.disconnectDevice(currentUser.userId, deviceId);
    return { success: true };
  }

  @Patch('devices/:deviceId/notification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Toggle notification settings for a specific device',
  })
  async toggleDeviceNotification(
    @CurrentUser() currentUser: { userId: string },
    @Param('deviceId') deviceId: string,
    @Body('enabled') enabled: boolean,
  ): Promise<any> {
    await this.usersService.toggleDeviceNotification(
      currentUser.userId,
      deviceId,
      enabled,
    );
    return { success: true };
  }

  @Post('devices/:deviceId/test-notification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send a test push notification to a specific device',
  })
  async sendTestNotification(
    @CurrentUser() currentUser: { userId: string },
    @Param('deviceId') deviceId: string,
  ): Promise<any> {
    const user = await this.usersService.findById(currentUser.userId);
    let devices: any[] = [];
    if (user.loggedInDevices) {
      try {
        devices = JSON.parse(user.loggedInDevices);
      } catch {
        devices = [];
      }
    }
    const device = devices.find((d: any) => d.deviceId === deviceId);
    const deviceInfo = device?.deviceInfo || 'This Device';

    await this.notificationsQueue.add('send-push', {
      title: 'Test Notification',
      body: `Hello! This is a test notification for your device: ${deviceInfo}`,
      recipients: [`${currentUser.userId}:${deviceId}`],
      metadata: {
        type: 'test_notification',
        deviceId,
      },
    });
    return { success: true };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by UUID' })
  @ApiParam({ name: 'id', description: 'User unique UUID' })
  @ApiResponse({
    status: 200,
    description: 'User profile details.',
    type: User,
  })
  async findById(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }
}
