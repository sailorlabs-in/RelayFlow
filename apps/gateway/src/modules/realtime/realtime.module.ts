import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { UsersModule } from '../users/users.module';
import { GroupsModule } from '../groups/groups.module';

import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => ChatModule),
    UsersModule,
    forwardRef(() => GroupsModule)
  ],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
