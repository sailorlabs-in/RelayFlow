import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Group, GroupMember, UpdateNote } from '@chat-app/database';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { GroupsModule } from '../groups/groups.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Group, GroupMember, UpdateNote]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => GroupsModule),
    forwardRef(() => RealtimeModule),
  ],
  controllers: [AdminController],
  providers: [JwtAuthGuard, PlatformAdminGuard],
  exports: [],
})
export class AdminModule {}
