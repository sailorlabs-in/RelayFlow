import type { IncomingMessage } from 'http';

import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { Options } from 'pino-http';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
                translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
              },
            }
          : undefined,
        autoLogging: true,
        customProps: (req: IncomingMessage) => ({
          requestId: req.headers['x-request-id'] || 'system',
        }),
      } as Options,
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
