// Load workspace .env before all other imports so process.env is populated

require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino logger globally
  app.useLogger(app.get(PinoLogger));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // -------------------------------------------------------------
  // Swagger Documentation Setup (Locked with Basic Auth)
  // -------------------------------------------------------------
  const adminUser =
    process.env.ADMIN_USERNAME ||
    process.env.ADMIN_DOCS_USERNAME ||
    process.env.BULL_BOARD_USERNAME ||
    'admin';
  const adminPass =
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_DOCS_PASSWORD ||
    process.env.BULL_BOARD_PASSWORD ||
    'admin';

  app.use(
    ['/docs', '/docs/', '/docs-json'],
    (req: any, res: any, next: any) => {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Basic ')) {
        const credentials = Buffer.from(
          authHeader.split(' ')[1],
          'base64',
        ).toString('utf-8');
        const [user, pass] = credentials.split(':');
        if (user === adminUser && pass === adminPass) {
          return next();
        }
      }

      res.setHeader(
        'WWW-Authenticate',
        'Basic realm="RelayFlow Worker Swagger Documentation"',
      );
      return res
        .status(401)
        .send('Authentication required to access API Documentation');
    },
  );

  const config = new DocumentBuilder()
    .setTitle('RelayFlow Worker Service API')
    .setDescription(
      'Worker Service OpenAPI documentation for RelayFlow platform background job processing',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  // -------------------------------------------------------------

  const port = process.env.WORKER_PORT ?? process.env.PORT ?? 4002;
  await app.listen(port);

  Logger.log(
    `🚀 RelayFlow Worker Service is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `📖 Worker API Documentation is available at: http://localhost:${port}/docs`,
  );
}

bootstrap().catch((err: unknown) => {
  Logger.error('❌ Worker-service bootstrap failed', err);
});
