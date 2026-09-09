import { User, Friendship, UpdateNote } from '@chat-app/database';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DEFAULT_QUEUE_JOB_OPTIONS, QueueNames } from '@chat-app/queues';

import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Friendship, UpdateNote]),
    BullModule.registerQueue({
      name: QueueNames.NOTIFICATIONS,
      defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS,
    }),
    forwardRef(() => AuthModule),
    forwardRef(() => RealtimeModule),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService, BullModule],
})
export class UsersModule {}
