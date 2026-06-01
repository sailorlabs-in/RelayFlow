import { User } from '@chat-app/database';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';

import { CryptoUtil } from './crypto.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async register(email: string, password: string, displayName?: string): Promise<User> {
    const passwordHash = CryptoUtil.hashPassword(password);
    return this.usersService.create(email, passwordHash, displayName);
  }

  async login(email: string, password: string): Promise<{ accessToken: string; user: User }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('❌ Invalid email or password');
    }

    const isMatch = CryptoUtil.verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('❌ Invalid email or password');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async validateToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return { userId: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('❌ Invalid or expired token');
    }
  }
}
