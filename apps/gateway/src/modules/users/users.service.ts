import { User, Friendship, FriendshipStatus } from '@chat-app/database';
import { RedisService } from '@chat-app/redis';
import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';

import { CryptoUtil } from '../auth/crypto.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    private readonly redisService: RedisService,
  ) {}

  async create(
    email: string,
    passwordHash: string,
    displayName?: string,
    username?: string,
  ): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('❌ Email is already registered');
    }

    if (username) {
      const existingUsername = await this.userRepository.findOne({
        where: { username },
      });
      if (existingUsername) {
        throw new ConflictException('❌ Username is already registered');
      }
    }

    const user = this.userRepository.create({
      email,
      passwordHash,
      username,
      displayName: displayName || username || email.split('@')[0],
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

  async isUsernameAvailable(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const trimmed = username.toLowerCase().trim();
    if (trimmed.length < 3) {
      return false;
    }

    const whereClause: any = { username: trimmed };
    if (excludeUserId) {
      whereClause.id = Not(excludeUserId);
    }
    const existing = await this.userRepository.findOne({ where: whereClause });
    return !existing;
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
      username?: string;
      password?: string;
      themeMode?: string;
      themeSchema?: string;
      status?: string;
      visibility?: string;
      notificationsEnabled?: boolean;
      notificationsDmEnabled?: boolean;
      notificationsGroupEnabled?: boolean;
      notificationsInAppEnabled?: boolean;
      notificationsFriendRequestEnabled?: boolean;
    },
  ): Promise<User> {
    const user = await this.findById(id);

    if (data.displayName !== undefined) {
      user.displayName = data.displayName;
    }

    if (data.username !== undefined && data.username.trim() !== '') {
      const trimmed = data.username.toLowerCase().trim();
      const existing = await this.userRepository.findOne({
        where: { username: trimmed, id: Not(user.id) },
      });
      if (existing) {
        throw new ConflictException('❌ Username is already registered.');
      }
      user.username = trimmed;
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

    if (data.notificationsFriendRequestEnabled !== undefined) {
      user.notificationsFriendRequestEnabled =
        data.notificationsFriendRequestEnabled;
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

  async searchFriend(query: string, excludeUserId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: [{ email: query }, { username: query }],
    });
    if (!user) {
      throw new NotFoundException('❌ User not found');
    }
    if (user.id === excludeUserId) {
      throw new ConflictException('❌ You cannot add yourself as a friend');
    }
    return user;
  }

  async sendFriendRequest(
    requesterId: string,
    emailOrUsername: string,
  ): Promise<Friendship> {
    const addressee = await this.userRepository.findOne({
      where: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    if (!addressee) {
      throw new NotFoundException('❌ User not found');
    }
    if (addressee.id === requesterId) {
      throw new ConflictException('❌ You cannot add yourself as a friend');
    }

    // Check if relationship already exists
    const existing = await this.friendshipRepository.findOne({
      where: [
        { requesterId, addresseeId: addressee.id },
        { requesterId: addressee.id, addresseeId: requesterId },
      ],
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('❌ You are already friends');
      }
      if (existing.status === FriendshipStatus.PENDING) {
        if (existing.requesterId === requesterId) {
          throw new ConflictException('❌ Friend request already sent');
        } else {
          // The other person sent a request, auto-accept it!
          existing.status = FriendshipStatus.ACCEPTED;
          const saved = await this.friendshipRepository.save(existing);
          return this.friendshipRepository.findOne({
            where: { id: saved.id },
            relations: ['requester', 'addressee'],
          });
        }
      }
      // If declined, reset to pending
      existing.status = FriendshipStatus.PENDING;
      existing.requesterId = requesterId;
      existing.addresseeId = addressee.id;
      const saved = await this.friendshipRepository.save(existing);
      return this.friendshipRepository.findOne({
        where: { id: saved.id },
        relations: ['requester', 'addressee'],
      });
    }

    const request = this.friendshipRepository.create({
      requesterId,
      addresseeId: addressee.id,
      status: FriendshipStatus.PENDING,
    });

    const saved = await this.friendshipRepository.save(request);
    return this.friendshipRepository.findOne({
      where: { id: saved.id },
      relations: ['requester', 'addressee'],
    });
  }

  async getPendingRequests(
    userId: string,
  ): Promise<{ incoming: Friendship[]; outgoing: Friendship[] }> {
    const incoming = await this.friendshipRepository.find({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester'],
    });
    const outgoing = await this.friendshipRepository.find({
      where: { requesterId: userId, status: FriendshipStatus.PENDING },
      relations: ['addressee'],
    });
    return { incoming, outgoing };
  }

  async acceptFriendRequest(
    userId: string,
    requestId: string,
  ): Promise<Friendship> {
    const request = await this.friendshipRepository.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('❌ Friend request not found');
    }
    if (request.addresseeId !== userId) {
      throw new ForbiddenException(
        '❌ You can only accept friend requests sent to you',
      );
    }
    request.status = FriendshipStatus.ACCEPTED;
    const saved = await this.friendshipRepository.save(request);
    return this.friendshipRepository.findOne({
      where: { id: saved.id },
      relations: ['requester', 'addressee'],
    });
  }

  async declineFriendRequest(
    userId: string,
    requestId: string,
  ): Promise<Friendship> {
    const request = await this.friendshipRepository.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('❌ Friend request not found');
    }
    if (request.addresseeId !== userId && request.requesterId !== userId) {
      throw new ForbiddenException(
        '❌ You do not have permission for this request',
      );
    }
    await this.friendshipRepository.delete({ id: requestId });
    return request;
  }

  async listFriends(userId: string): Promise<User[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
    });

    const friends: User[] = [];
    for (const f of friendships) {
      if (f.requesterId === userId && f.addressee) {
        friends.push(f.addressee);
      } else if (f.addresseeId === userId && f.requester) {
        friends.push(f.requester);
      }
    }
    return friends;
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    await this.friendshipRepository.delete([
      {
        requesterId: userId,
        addresseeId: friendId,
        status: FriendshipStatus.ACCEPTED,
      },
      {
        requesterId: friendId,
        addresseeId: userId,
        status: FriendshipStatus.ACCEPTED,
      },
    ]);
  }

  async isFriend(userAId: string, userBId: string): Promise<boolean> {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        {
          requesterId: userAId,
          addresseeId: userBId,
          status: FriendshipStatus.ACCEPTED,
        },
        {
          requesterId: userBId,
          addresseeId: userAId,
          status: FriendshipStatus.ACCEPTED,
        },
      ],
    });
    return !!friendship;
  }
}
