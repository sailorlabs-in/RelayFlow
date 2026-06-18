import {
  Group,
  GroupMember,
  Conversation,
  ConversationMember,
  GroupInvite,
  GroupRole,
  GroupSection,
  GroupOwnershipTransfer,
} from '@chat-app/database';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ChatModule } from '../chat/chat.module';
import { EmailModule } from '../email/email.module';

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
      GroupOwnershipTransfer,
    ]),
    forwardRef(() => RealtimeModule),
    forwardRef(() => AuthModule),
    forwardRef(() => ChatModule),
    EmailModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
