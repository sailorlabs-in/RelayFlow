import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from '@chat-app/queues';
import { EmailService } from './email.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: QueueNames.EMAILS,
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
