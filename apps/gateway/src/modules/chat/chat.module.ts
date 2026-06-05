import { Conversation, ConversationMember, Message } from '@chat-app/database';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UsersModule } from '../users/users.module';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ConversationMember, Message]),
    forwardRef(() => RealtimeModule),
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
  ],
  providers: [ChatService, NotificationService],
  controllers: [ChatController],
  exports: [ChatService, NotificationService],
})
export class ChatModule {}
