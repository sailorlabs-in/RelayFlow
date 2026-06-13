import { SetMetadata } from '@nestjs/common';
import type { GroupPermission } from '@chat-app/database';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: GroupPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
