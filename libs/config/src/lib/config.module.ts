import * as path from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import appConfig from './app.config';
import authConfig from './auth.config';
import { environmentSchema } from './config.schema';
import databaseConfig from './database.config';
import emailConfig from './email.config';
import redisConfig from './redis.config';
import throttlerConfig from './throttler.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '../../.env'),
        path.resolve(__dirname, '../../.env'),
        path.resolve(__dirname, '../../../.env'),
        '.env',
      ],
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        authConfig,
        emailConfig,
        throttlerConfig,
      ],
      validate: (config: Record<string, unknown>) => {
        try {
          return environmentSchema.parse(config);
        } catch (error) {
          throw new Error(
            `❌ Environment validation failed:\n${JSON.stringify(error, null, 2)}`,
          );
        }
      },
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
