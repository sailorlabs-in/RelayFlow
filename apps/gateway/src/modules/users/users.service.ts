import { User } from '@chat-app/database';
import { RedisService } from '@chat-app/redis';
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CryptoUtil } from '../auth/crypto.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  async create(
    email: string,
    passwordHash: string,
    displayName?: string,
  ): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('❌ Email is already registered');
    }

    const user = this.userRepository.create({
      email,
      passwordHash,
      displayName: displayName || email.split('@')[0],
      themeSchema: 'arctic_glass',
      themeMode: 'system',
    });

    const saved = await this.userRepository.save(user);

    // Cache the user profile
    const redis = this.redisService.getClient();
    const cacheKey = `user:profile:${saved.id}`;
    try {
      await redis.setex(cacheKey, 86400, JSON.stringify(saved));
    } catch (err) {
      // ignore
    }

    return saved;
  }

  async findById(id: string): Promise<User> {
    const redis = this.redisService.getClient();
    const cacheKey = `user:profile:${id}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      // Don't fail the request if Redis is down
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('❌ User not found');
    }

    try {
      await redis.setex(cacheKey, 86400, JSON.stringify(user));
    } catch (err) {
      // Don't fail the request if Redis is down
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async search(query: string): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.display_name ILIKE :query OR user.email ILIKE :query', {
        query: `%${query}%`,
      })
      .getMany();
  }

  async updateProfile(
    id: string,
    data: {
      displayName?: string;
      password?: string;
      themeMode?: string;
      themeSchema?: string;
      status?: string;
      visibility?: string;
      notificationsEnabled?: boolean;
      notificationsDmEnabled?: boolean;
      notificationsGroupEnabled?: boolean;
      notificationsInAppEnabled?: boolean;
    },
  ): Promise<User> {
    const user = await this.findById(id);

    if (data.displayName !== undefined) {
      user.displayName = data.displayName;
    }

    if (data.password !== undefined && data.password.trim() !== '') {
      user.passwordHash = CryptoUtil.hashPassword(data.password);
    }

    if (data.themeMode !== undefined) {
      user.themeMode = data.themeMode;
    }

    if (data.themeSchema !== undefined) {
      user.themeSchema = data.themeSchema;
    }

    if (data.status !== undefined) {
      user.status = data.status;
    }

    if (data.visibility !== undefined) {
      user.visibility = data.visibility;
    }

    if (data.notificationsEnabled !== undefined) {
      user.notificationsEnabled = data.notificationsEnabled;
    }

    if (data.notificationsDmEnabled !== undefined) {
      user.notificationsDmEnabled = data.notificationsDmEnabled;
    }

    if (data.notificationsGroupEnabled !== undefined) {
      user.notificationsGroupEnabled = data.notificationsGroupEnabled;
    }

    if (data.notificationsInAppEnabled !== undefined) {
      user.notificationsInAppEnabled = data.notificationsInAppEnabled;
    }

    const updatedUser = await this.userRepository.save(user);

    // Update Redis cache
    const redis = this.redisService.getClient();
    const cacheKey = `user:profile:${id}`;
    try {
      await redis.setex(cacheKey, 86400, JSON.stringify(updatedUser));
    } catch (err) {
      // ignore
    }

    return updatedUser;
  }
}
