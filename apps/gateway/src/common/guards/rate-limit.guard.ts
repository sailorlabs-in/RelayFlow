import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RedisService } from '@chat-app/redis';
import type { Socket } from 'socket.io';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const type = context.getType();
    const redis = this.redisService.getClient();

    let key = '';
    let limit = 10;
    let ttl = 10; // in seconds

    if (type === 'http') {
      const request = context.switchToHttp().getRequest();
      const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
      const userId = request.user?.userId || 'anonymous';
      
      key = `ratelimit:http:${userId}:${ip}:${request.path}`;
      limit = 30; // 30 requests per 10s
      ttl = 10;
    } else if (type as string === 'ws') {
      const wsContext = context.switchToWs();
      const client = wsContext.getClient<Socket>();
      const userId = client.data?.userId || 'anonymous';
      const pattern = wsContext.getPattern();

      key = `ratelimit:ws:${userId}:${pattern}`;
      limit = 5; // 5 messages per 2s
      ttl = 2;
    } else {
      return true;
    }

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, ttl);
      }

      if (current > limit) {
        this.logger.warn(`🛑 Rate limit exceeded for key: ${key} (count: ${current})`);
        if (type === 'http') {
          throw new HttpException('Too many requests. Please slow down.', HttpStatus.TOO_MANY_REQUESTS);
        } else {
          const client = context.switchToWs().getClient<Socket>();
          client.emit('error', { message: 'Spam warning: Please slow down.' });
          return false;
        }
      }
    } catch (err) {
      // Don't block requests if Redis has issues, just log and allow
      this.logger.error('❌ Rate limit Redis error', err);
    }

    return true;
  }
}
