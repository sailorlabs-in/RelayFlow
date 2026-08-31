import { ConfigModule } from '@chat-app/config';
import { DatabaseModule } from '@chat-app/database';
import { LoggerModule } from '@chat-app/logger';
import { RedisModule } from '@chat-app/redis';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_QUEUE_JOB_OPTIONS, QueueNames } from '@chat-app/queues';

import { NotificationProcessor } from './processors/notification.processor';
import { EmailProcessor } from './processors/email.processor';
import { SystemCleanupProcessor } from './processors/system-cleanup.processor';
import { SystemCleanupService } from './services/system-cleanup.service';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    RedisModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QueueNames.NOTIFICATIONS,
      defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS,
    }),
    BullModule.registerQueue({
      name: QueueNames.EMAILS,
      defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS,
    }),
    BullModule.registerQueue({
      name: QueueNames.SYSTEM_CLEANUP,
    }),
  ],
  providers: [
    NotificationProcessor,
    EmailProcessor,
    SystemCleanupProcessor,
    SystemCleanupService,
  ],
})
export class AppModule {}
