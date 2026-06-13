import {
  Group,
  GroupMember,
  Conversation,
  ConversationMember,
  GroupInvite,
  GroupRole,
  GroupSection,
} from '@chat-app/database';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ChatModule } from '../chat/chat.module';

import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      GroupMember,
      Conversation,
      ConversationMember,
      GroupInvite,
      GroupRole,
      GroupSection,
    ]),
    forwardRef(() => RealtimeModule),
    forwardRef(() => AuthModule),
    forwardRef(() => ChatModule),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
