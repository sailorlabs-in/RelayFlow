import { DatabaseModule } from '@chat-app/database';
import { RedisModule } from '@chat-app/redis';
import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [HealthController],
})
export class HealthModule {}
