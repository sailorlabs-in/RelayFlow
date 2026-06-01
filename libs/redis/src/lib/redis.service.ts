import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');

    this.logger.log(`✔ Connecting to Redis at ${host}:${port}...`);
    this.client = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: null, // Crucial for BullMQ integration
    });

    this.client.on('connect', () => {
      this.logger.log('✔ Redis connection established successfully.');
    });

    this.client.on('error', (err: unknown) => {
      this.logger.error('❌ Redis connection error', err);
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('✔ Closing Redis connection pool...');
    await this.client.quit();
    this.logger.log('✔ Redis connection closed.');
  }

  getClient(): Redis {
    return this.client;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error('❌ Redis health check failed', error);
      return false;
    }
  }
}
