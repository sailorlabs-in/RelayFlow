import { Conversation, Message } from '@chat-app/database';
import { Controller, Post, Get, Body, Param, Query, Delete, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';

import { ChatService } from './chat.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@ApiTags('Chat & Conversations')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new DM or group conversation' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userIds'],
      properties: {
        userIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['usr_uuid_1', 'usr_uuid_2'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Conversation successfully initialized.', type: Conversation })
  async createConversation(@Body('userIds') userIds: string[]): Promise<Conversation> {
    return this.chatService.createConversation(userIds);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for a specific user' })
  @ApiQuery({ name: 'userId', required: true, description: 'User unique UUID identifier' })
  @ApiResponse({ status: 200, description: 'List of user conversations.', type: [Conversation] })
  async getConversations(@Query('userId') userId: string): Promise<Conversation[]> {
    return this.chatService.getConversationsForUser(userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Fetch paginated message archive for a conversation room' })
  @ApiParam({ name: 'id', description: 'Conversation unique UUID identifier' })
  @ApiQuery({ name: 'limit', required: false, description: 'Message fetch limits count (default 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset index count (default 0)' })
  @ApiResponse({ status: 200, description: 'Paginated message history.', type: [Message] })
  async getMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ): Promise<Message[]> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.chatService.getMessages(id, limitNum, offsetNum);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation thread, message history and memberships' })
  @ApiParam({ name: 'id', description: 'Conversation unique UUID identifier' })
  @ApiResponse({ status: 200, description: 'Conversation thread successfully removed.' })
  async deleteConversation(@Param('id') id: string): Promise<{ success: boolean }> {
    // Fetch members BEFORE deleting so we can still notify them in real-time
    const members = await this.chatService.getConversationMembers(id);

    await this.chatService.deleteConversation(id);

    // Broadcast conversation.deleted to every participant's private user room
    for (const member of members) {
      this.realtimeGateway.server.to(`user:${member.userId}`).emit('conversation.deleted', { conversationId: id });
    }

    return { success: true };
  }
}
