import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DEFAULT_QUEUE_JOB_OPTIONS, QueueNames } from '@chat-app/queues';
import { EmailService } from './email.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: QueueNames.EMAILS,
      defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS,
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
