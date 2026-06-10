import { DatabaseService } from '@chat-app/database';
import { RedisService } from '@chat-app/redis';
import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run database, cache, and storage bucket connection checks',
  })
  @ApiResponse({
    status: 200,
    description: 'System connections are healthy.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2026-06-01T15:45:00.000Z' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'up' },
            redis: { type: 'string', example: 'up' },
            bucket: { type: 'string', example: 'up' },
            application: { type: 'string', example: 'up' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'One or more critical services are unhealthy.',
  })
  async getHealth(): Promise<Record<string, unknown>> {
    const dbHealthy = await this.databaseService.checkHealth();
    const redisHealthy = await this.redisService.checkHealth();

    let bucketHealthy = false;
    try {
      const bucketUrl = this.configService.get<string>(
        'app.bucketUrl',
        'https://bucket.umangsailor.com',
      );
      const response = await axios.get(`${bucketUrl}/health`, {
        timeout: 3000,
      });
      if (response.status === 200 && response.data?.status === 'healthy') {
        bucketHealthy = true;
      }
    } catch (err: any) {
      this.logger.error(`❌ Bucket health check failed: ${err.message}`);
    }

    const isHealthy = dbHealthy && redisHealthy && bucketHealthy;

    const healthStatus = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
        bucket: bucketHealthy ? 'up' : 'down',
        application: 'up',
      },
    };

    if (!isHealthy) {
      this.logger.warn(
        '❌ Health check returned unhealthy status',
        healthStatus,
      );
    }

    return healthStatus;
  }
}
