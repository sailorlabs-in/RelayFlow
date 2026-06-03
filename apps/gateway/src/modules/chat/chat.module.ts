import { Conversation, ConversationMember, Message } from '@chat-app/database';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UsersModule } from '../users/users.module';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ConversationMember, Message]),
    forwardRef(() => RealtimeModule),
    UsersModule,
    AuthModule,
  ],
  providers: [ChatService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
