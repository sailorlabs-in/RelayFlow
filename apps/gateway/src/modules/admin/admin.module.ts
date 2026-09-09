import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { QueueNames, DEFAULT_QUEUE_JOB_OPTIONS } from '@chat-app/queues';
import * as jwt from 'jsonwebtoken';

import { ConfigModule } from '@chat-app/config';
import { ConfigService } from '@nestjs/config';

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
    BullModule.registerQueue(
      {
        name: QueueNames.EMAILS,
        defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS,
      },
      {
        name: QueueNames.NOTIFICATIONS,
        defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS,
      },
      {
        name: QueueNames.SYSTEM_CLEANUP,
        defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS,
      },
    ),
    BullBoardModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expectedUser =
          configService.get<string>('ADMIN_USERNAME') ||
          configService.get<string>('ADMIN_DOCS_USERNAME') ||
          configService.get<string>('BULL_BOARD_USERNAME') ||
          'admin';
        const expectedPass =
          configService.get<string>('ADMIN_PASSWORD') ||
          configService.get<string>('ADMIN_DOCS_PASSWORD') ||
          configService.get<string>('BULL_BOARD_PASSWORD') ||
          'admin';
        const jwtSecret =
          configService.get<string>('auth.jwtSecret') ||
          configService.get<string>('JWT_SECRET') ||
          'relayflow-super-secret-key-12345';

        return {
          route: '/admin/queues',
          adapter: ExpressAdapter,
          middleware: (req: any, res: any, next: any) => {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Basic ')) {
              const base64Credentials = authHeader.split(' ')[1];
              const credentials = Buffer.from(
                base64Credentials,
                'base64',
              ).toString('utf-8');
              const [username, password] = credentials.split(':');
              if (username === expectedUser && password === expectedPass) {
                return next();
              }
            }

            const token =
              (authHeader && authHeader.startsWith('Bearer ')
                ? authHeader.split(' ')[1]
                : null) || req.query?.token;

            if (token) {
              try {
                const decoded: any = jwt.verify(token, jwtSecret);
                if (decoded && (decoded.role === 'admin' || decoded.userId)) {
                  return next();
                }
              } catch {
                // Fall through to basic auth challenge
              }
            }

            res.setHeader(
              'WWW-Authenticate',
              'Basic realm="RelayFlow BullMQ Dashboard"',
            );
            return res.status(401).send('Authentication required');
          },
        };
      },
      inject: [ConfigService],
    }),
    BullBoardModule.forFeature(
      {
        name: QueueNames.EMAILS,
        adapter: BullMQAdapter,
      },
      {
        name: QueueNames.NOTIFICATIONS,
        adapter: BullMQAdapter,
      },
      {
        name: QueueNames.SYSTEM_CLEANUP,
        adapter: BullMQAdapter,
      },
    ),
  ],
  controllers: [AdminController],
  providers: [JwtAuthGuard, PlatformAdminGuard],
  exports: [BullModule, BullBoardModule],
})
export class AdminModule {}
