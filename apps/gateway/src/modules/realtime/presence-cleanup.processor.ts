import { QueueNames } from '@chat-app/queues';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { Job } from 'bullmq';

import { RealtimeGateway } from './realtime.gateway';

@Processor(QueueNames.REALTIME_TASKS)
export class PresenceCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(PresenceCleanupProcessor.name);

  constructor(
    @Inject(forwardRef(() => RealtimeGateway))
    private readonly realtimeGateway: RealtimeGateway,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'check-stale-presence') {
      await this.realtimeGateway.checkAndCleanupAwayUsers();
    }
  }
}
