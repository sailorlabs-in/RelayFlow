import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import appConfig from './app.config';
import authConfig from './auth.config';
import { environmentSchema } from './config.schema';
import databaseConfig from './database.config';
import redisConfig from './redis.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, authConfig],
      validate: (config: Record<string, unknown>) => {
        try {
          return environmentSchema.parse(config);
        } catch (error) {
          throw new Error(`❌ Environment validation failed:\n${JSON.stringify(error, null, 2)}`);
        }
      },
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
