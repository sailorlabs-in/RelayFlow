import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const user = await this.usersService.findById(userId);
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException(
        'Access Denied: Platform Admin privileges required',
      );
    }

    return true;
  }
}
