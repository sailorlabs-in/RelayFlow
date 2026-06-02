import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';

import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AuthModule, forwardRef(() => ChatModule)],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
