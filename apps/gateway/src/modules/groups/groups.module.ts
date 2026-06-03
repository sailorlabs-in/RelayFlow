import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group, GroupMember, Conversation, ConversationMember } from '@chat-app/database';

import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';

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
