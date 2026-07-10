import { User, Friendship, UpdateNote } from '@chat-app/database';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CleanUpService } from './cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Friendship, UpdateNote]),
    forwardRef(() => AuthModule),
    forwardRef(() => RealtimeModule),
  ],
  providers: [UsersService, CleanUpService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
