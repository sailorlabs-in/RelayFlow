import { Group, GroupMember, Conversation, ConversationMember } from '@chat-app/database';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, Conversation, ConversationMember]),
    forwardRef(() => RealtimeModule),
    AuthModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
