import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@chat-app/database';
import { Repository, LessThan } from 'typeorm';

@Injectable()
export class CleanUpService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CleanUpService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  onApplicationBootstrap() {
    // Run cleanup once on startup, and then every 1 hour
    this.cleanupUnverifiedUsers();
    setInterval(
      () => {
        this.cleanupUnverifiedUsers();
      },
      60 * 60 * 1000,
    ); // 1 hour
  }

  async cleanupUnverifiedUsers() {
    try {
      this.logger.log(
        '⚙ Running cleanup check for expired unverified accounts (24h limit)...',
      );
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const result = await this.userRepository.delete({
        isVerified: false,
        createdAt: LessThan(cutoff),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `🗑 Removed ${result.affected} expired unverified accounts.`,
        );
      } else {
        this.logger.log('✔ No expired unverified accounts found.');
      }
    } catch (error) {
      this.logger.error('❌ Failed to run unverified users cleanup:', error);
    }
  }
}
