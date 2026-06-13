import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
  forwardRef,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GroupsService } from '../../modules/groups/groups.service';
import { ChatService } from '../../modules/chat/chat.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { GroupPermission } from '@chat-app/database';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => GroupsService))
    private readonly groupsService: GroupsService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      GroupPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    let userId: string | undefined;
    let groupId: string | undefined;
    let channelId: string | undefined;

    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      userId = request.user?.userId;
      groupId =
        request.params?.id ||
        request.params?.groupId ||
        request.body?.groupId ||
        request.query?.groupId;
      channelId = request.params?.channelId || request.body?.channelId;
    } else if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient();
      const data = context.switchToWs().getData();
      userId = client.data?.userId;
      groupId = data?.groupId;
      channelId = data?.conversationId || data?.channelId;
    }

    if (!userId) {
      throw new ForbiddenException('❌ Authentication required');
    }

    if (!groupId && channelId) {
      const convo = await this.chatService.getConversation(channelId);
      if (convo) {
        groupId = convo.groupId;
      }
    }

    if (!groupId) {
      throw new ForbiddenException('❌ Group context not specified');
    }

    for (const permission of requiredPermissions) {
      const hasPerm = await this.groupsService.hasPermission(
        groupId,
        userId,
        permission,
      );
      if (!hasPerm) {
        throw new ForbiddenException(
          `❌ You lack the required permission: ${permission}`,
        );
      }
    }

    return true;
  }
}
