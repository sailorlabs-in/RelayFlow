import { Conversation, Message } from '@chat-app/database';
import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';

import { ChatService } from './chat.service';

@ApiTags('Chat & Conversations')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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
}
