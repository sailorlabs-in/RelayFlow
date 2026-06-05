import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from '@chat-app/queues';

import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { UsersModule } from '../users/users.module';
import { GroupsModule } from '../groups/groups.module';

import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => ChatModule),
    forwardRef(() => UsersModule),
    forwardRef(() => GroupsModule),
    BullModule.registerQueue({
      name: QueueNames.NOTIFICATIONS,
    }),
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway, BullModule],
})
export class RealtimeModule {}
