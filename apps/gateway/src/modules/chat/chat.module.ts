import {
  Conversation,
  ConversationMember,
  Message,
  ReadReceipt,
} from '@chat-app/database';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UsersModule } from '../users/users.module';
import { GroupsModule } from '../groups/groups.module';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationMember,
      Message,
      ReadReceipt,
    ]),
    forwardRef(() => RealtimeModule),
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    forwardRef(() => GroupsModule),
  ],
  providers: [ChatService, NotificationService],
  controllers: [ChatController],
  exports: [ChatService, NotificationService],
})
export class ChatModule {}
