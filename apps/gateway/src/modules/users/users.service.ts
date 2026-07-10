import { User, Friendship, FriendshipStatus } from '@chat-app/database';
import { RedisService } from '@chat-app/redis';
import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, Brackets, In } from 'typeorm';

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

  async findById(id: string, bypassCache = false): Promise<User> {
    const redis = this.redisService.getClient();
    const cacheKey = `user:profile:${id}`;

    if (!bypassCache) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        // Don't fail the request if Redis is down
      }
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

  async findByIds(ids: string[]): Promise<User[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    const uniqueIds = Array.from(new Set(ids));
    const redis = this.redisService.getClient();
    const result: User[] = [];
    const missingIds: string[] = [];

    // Try cache first
    try {
      const keys = uniqueIds.map((id) => `user:profile:${id}`);
      const cached = await redis.mget(keys);
      for (let i = 0; i < uniqueIds.length; i++) {
        if (cached[i]) {
          result.push(JSON.parse(cached[i]));
        } else {
          missingIds.push(uniqueIds[i]);
        }
      }
    } catch (err) {
      // Redis error, fallback to fetching all from db
      missingIds.push(...uniqueIds);
    }

    if (missingIds.length > 0) {
      const dbUsers = await this.userRepository.find({
        where: { id: In(missingIds) },
      });
      if (dbUsers.length > 0) {
        result.push(...dbUsers);
        // Save to cache
        try {
          const pipeline = redis.pipeline();
          for (const user of dbUsers) {
            pipeline.setex(
              `user:profile:${user.id}`,
              86400,
              JSON.stringify(user),
            );
          }
          await pipeline.exec();
        } catch (err) {
          // Ignore cache save error
        }
      }
    }

    return result;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    const trimmed = emailOrUsername ? emailOrUsername.trim() : '';
    if (!trimmed) {
      return null;
    }
    return this.userRepository.findOne({
      where: [{ email: trimmed }, { username: trimmed }],
    });
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
      groupNotificationPref?: 'all' | 'mention' | 'none';
      notificationsInAppEnabled?: boolean;
      notificationsFriendRequestEnabled?: boolean;
      isTwoFactorEnabled?: boolean;
      twoFactorOnlyNewDevice?: boolean;
      avatarUrl?: string;
      avatarThumbnailUrl?: string;
      groupOrder?: string;
      customThemes?: string;
      lastSeenUpdateNoteId?: string;
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

    if (data.groupNotificationPref !== undefined) {
      user.groupNotificationPref = data.groupNotificationPref;
    }

    if (data.notificationsInAppEnabled !== undefined) {
      user.notificationsInAppEnabled = data.notificationsInAppEnabled;
    }

    if (data.notificationsFriendRequestEnabled !== undefined) {
      user.notificationsFriendRequestEnabled =
        data.notificationsFriendRequestEnabled;
    }

    if (data.isTwoFactorEnabled !== undefined) {
      user.isTwoFactorEnabled = data.isTwoFactorEnabled;
    }

    if (data.twoFactorOnlyNewDevice !== undefined) {
      user.twoFactorOnlyNewDevice = data.twoFactorOnlyNewDevice;
    }

    if (data.avatarUrl !== undefined) {
      user.avatarUrl = data.avatarUrl;
    }

    if (data.avatarThumbnailUrl !== undefined) {
      user.avatarThumbnailUrl = data.avatarThumbnailUrl;
    }

    if (data.groupOrder !== undefined) {
      user.groupOrder = data.groupOrder;
    }

    if (data.customThemes !== undefined) {
      user.customThemes = data.customThemes;
    }

    if (data.lastSeenUpdateNoteId !== undefined) {
      user.lastSeenUpdateNoteId = data.lastSeenUpdateNoteId;
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

  async searchFriend(query: string, excludeUserId: string): Promise<User[]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.username',
        'user.displayName',
        'user.avatarUrl',
        'user.avatarThumbnailUrl',
        'user.status',
        'user.visibility',
      ])
      .where('user.id != :excludeUserId', { excludeUserId })
      .andWhere('user.isVerified = :isVerified', { isVerified: true });

    const trimmed = query ? query.trim() : '';
    const isSearch =
      trimmed !== '' && trimmed !== 'undefined' && trimmed !== 'null';

    console.log(
      `[searchFriend] query='${query}', trimmed='${trimmed}', isSearch=${isSearch}`,
    );

    if (isSearch) {
      qb.andWhere(
        '(user.email ILIKE :query OR user.username ILIKE :query OR user.display_name ILIKE :query)',
        { query: `%${trimmed}%` },
      );
    } else {
      // Apply visibility settings since it's the initial load with no query
      const friends = await this.listFriends(excludeUserId);
      const friendsOfYIds = friends.map((f) => f.id);

      if (friendsOfYIds.length > 0) {
        qb.andWhere(
          new Brackets((orQb) => {
            orQb
              .where("user.visibility = 'everyone'")
              .orWhere('user.visibility IS NULL')
              .orWhere(
                "user.visibility = 'friends_of_friends' AND EXISTS (" +
                  'SELECT 1 FROM friendship f ' +
                  'WHERE ( ' +
                  '(f.requester_id = user.id AND f.addressee_id IN (:...friendsOfYIds)) ' +
                  'OR ' +
                  '(f.addressee_id = user.id AND f.requester_id IN (:...friendsOfYIds)) ' +
                  ') ' +
                  "AND f.status = 'accepted'" +
                  ')',
                { friendsOfYIds },
              );
          }),
        );
      } else {
        qb.andWhere(
          new Brackets((orQb) => {
            orQb
              .where("user.visibility = 'everyone'")
              .orWhere('user.visibility IS NULL');
          }),
        );
      }
    }

    return qb.getMany();
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
          return this.findFriendshipOrThrow(saved.id);
        }
      }
      // If declined, reset to pending
      existing.status = FriendshipStatus.PENDING;
      existing.requesterId = requesterId;
      existing.addresseeId = addressee.id;
      const saved = await this.friendshipRepository.save(existing);
      return this.findFriendshipOrThrow(saved.id);
    }

    const request = this.friendshipRepository.create({
      requesterId,
      addresseeId: addressee.id,
      status: FriendshipStatus.PENDING,
    });

    const saved = await this.friendshipRepository.save(request);
    return this.findFriendshipOrThrow(saved.id);
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
    return this.findFriendshipOrThrow(saved.id);
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

  async updateVerificationOtp(
    id: string,
    otp: string,
    expiresAt: Date,
  ): Promise<void> {
    const redis = this.redisService.getClient();
    const ttlSeconds = Math.max(
      1,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    );
    await redis.setex(`otp:verification:${id}`, ttlSeconds, otp);
  }

  async getVerificationOtp(id: string): Promise<string | null> {
    const redis = this.redisService.getClient();
    return redis.get(`otp:verification:${id}`);
  }

  async updateTwoFactorOtp(
    id: string,
    otp: string,
    expiresAt: Date,
  ): Promise<void> {
    const redis = this.redisService.getClient();
    const ttlSeconds = Math.max(
      1,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    );
    await redis.setex(`otp:2fa:${id}`, ttlSeconds, otp);
  }

  async getTwoFactorOtp(id: string): Promise<string | null> {
    const redis = this.redisService.getClient();
    return redis.get(`otp:2fa:${id}`);
  }

  async clearTwoFactorOtp(id: string): Promise<void> {
    const redis = this.redisService.getClient();
    await redis.del(`otp:2fa:${id}`);
  }

  async updateResetPasswordToken(
    id: string,
    token: string,
    expiresAt: Date,
  ): Promise<User> {
    const user = await this.findById(id);
    user.resetPasswordToken = token;
    user.resetPasswordExpiresAt = expiresAt;
    const saved = await this.userRepository.save(user);
    await this.updateRedisCache(saved);
    return saved;
  }

  async verifyUserEmail(id: string): Promise<User> {
    const user = await this.findById(id);
    user.isVerified = true;
    const saved = await this.userRepository.save(user);
    await this.updateRedisCache(saved);

    // Clear verification OTP from Redis
    const redis = this.redisService.getClient();
    try {
      await redis.del(`otp:verification:${id}`);
    } catch {
      // ignore
    }

    return saved;
  }

  async addRememberedDevice(id: string, deviceId: string): Promise<User> {
    const user = await this.findById(id);
    let devices: string[] = [];
    if (user.rememberedDevices) {
      try {
        devices = JSON.parse(user.rememberedDevices);
        if (!Array.isArray(devices)) {
          devices = [];
        }
      } catch {
        devices = [];
      }
    }
    if (!devices.includes(deviceId)) {
      devices.push(deviceId);
      user.rememberedDevices = JSON.stringify(devices);
    }
    const saved = await this.userRepository.save(user);
    await this.updateRedisCache(saved);
    return saved;
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete({ id });
    const redis = this.redisService.getClient();
    const cacheKey = `user:profile:${id}`;
    try {
      await redis.del(cacheKey);
    } catch {
      // ignore
    }
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { resetPasswordToken: token },
    });
  }

  async resetUserPassword(id: string, passwordHash: string): Promise<User> {
    const user = await this.findById(id);
    user.passwordHash = passwordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    const saved = await this.userRepository.save(user);
    await this.updateRedisCache(saved);
    return saved;
  }

  async registerLoggedInDevice(
    userId: string,
    device: { deviceId: string; userAgent: string; ip: string },
  ): Promise<User> {
    if (!device.deviceId) {
      return this.findById(userId);
    }
    const user = await this.findById(userId);
    let devices: any[] = [];
    if (user.loggedInDevices) {
      try {
        devices = JSON.parse(user.loggedInDevices);
        if (!Array.isArray(devices)) {
          devices = [];
        }
      } catch {
        devices = [];
      }
    }

    const cleanUA = (ua: string): string => {
      if (!ua) {
        return 'Unknown Device';
      }
      let browser = 'Unknown Browser';
      let os = 'Unknown OS';
      if (/windows/i.test(ua)) {
        os = 'Windows';
      } else if (/macintosh|mac os x/i.test(ua)) {
        os = 'macOS';
      } else if (/linux/i.test(ua)) {
        os = 'Linux';
      } else if (/android/i.test(ua)) {
        os = 'Android';
      } else if (/iphone|ipad|ipod/i.test(ua)) {
        os = 'iOS';
      }

      if (
        /chrome|crios/i.test(ua) &&
        !/edge|edg/i.test(ua) &&
        !/opr/i.test(ua)
      ) {
        browser = 'Chrome';
      } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
        browser = 'Safari';
      } else if (/firefox|fxios/i.test(ua)) {
        browser = 'Firefox';
      } else if (/edge|edg/i.test(ua)) {
        browser = 'Edge';
      } else if (/opr|opera/i.test(ua)) {
        browser = 'Opera';
      }

      return `${browser} on ${os}`;
    };

    const deviceInfo = cleanUA(device.userAgent);
    const existing = devices.find((d) => d.deviceId === device.deviceId);
    if (existing) {
      existing.userAgent = device.userAgent;
      existing.deviceInfo = deviceInfo;
      existing.ip = device.ip;
      existing.lastActive = new Date().toISOString();
    } else {
      devices.push({
        deviceId: device.deviceId,
        userAgent: device.userAgent,
        deviceInfo: deviceInfo,
        ip: device.ip,
        lastActive: new Date().toISOString(),
        notificationsEnabled: true,
      });
    }

    user.loggedInDevices = JSON.stringify(devices);
    const saved = await this.userRepository.save(user);
    await this.updateRedisCache(saved);
    return saved;
  }

  async logoutDevice(userId: string, deviceId: string): Promise<User> {
    const user = await this.findById(userId);
    let devices: any[] = [];
    if (user.loggedInDevices) {
      try {
        devices = JSON.parse(user.loggedInDevices);
        if (!Array.isArray(devices)) {
          devices = [];
        }
      } catch {
        devices = [];
      }
    }

    devices = devices.filter((d) => d.deviceId !== deviceId);
    user.loggedInDevices = JSON.stringify(devices);
    const saved = await this.userRepository.save(user);
    await this.updateRedisCache(saved);
    return saved;
  }

  async toggleDeviceNotification(
    userId: string,
    deviceId: string,
    enabled: boolean,
  ): Promise<User> {
    const user = await this.findById(userId);
    let devices: any[] = [];
    if (user.loggedInDevices) {
      try {
        devices = JSON.parse(user.loggedInDevices);
        if (!Array.isArray(devices)) {
          devices = [];
        }
      } catch {
        devices = [];
      }
    }

    const device = devices.find((d) => d.deviceId === deviceId);
    if (device) {
      device.notificationsEnabled = enabled;
    }

    user.loggedInDevices = JSON.stringify(devices);
    const saved = await this.userRepository.save(user);
    await this.updateRedisCache(saved);
    return saved;
  }

  private async updateRedisCache(user: User): Promise<void> {
    const redis = this.redisService.getClient();
    const cacheKey = `user:profile:${user.id}`;
    try {
      await redis.setex(cacheKey, 86400, JSON.stringify(user));
    } catch {
      // ignore
    }
  }

  private async findFriendshipOrThrow(id: string): Promise<Friendship> {
    const friendship = await this.friendshipRepository.findOne({
      where: { id },
      relations: ['requester', 'addressee'],
    });
    if (!friendship) {
      throw new NotFoundException('❌ Friendship not found');
    }
    return friendship;
  }
}
