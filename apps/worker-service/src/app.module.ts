import { ConfigModule } from '@chat-app/config';
import { DatabaseModule } from '@chat-app/database';
import { LoggerModule } from '@chat-app/logger';
import { RedisModule } from '@chat-app/redis';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    RedisModule,
  ],
})
export class AppModule {}
