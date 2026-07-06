import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('❌ Authorization header missing');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('❌ Invalid token format');
    }

    try {
      const reqDeviceId = request.headers['x-device-id'] as string;
      const userAgent = request.headers['user-agent'] as string;
      const ip = request.ip;
      const payload = await this.authService.validateTokenAndSession(
        token,
        reqDeviceId,
        userAgent,
        ip,
      );
      request.user = payload; // { userId, email, deviceId }
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('❌ Invalid or expired token');
    }
  }
}
