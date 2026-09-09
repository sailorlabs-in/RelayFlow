// Load workspace .env before all other imports so process.env is populated
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

import {
  GlobalExceptionFilter,
  ResponseInterceptor,
  RequestIdMiddleware,
} from '@chat-app/common';
import { Logger, ValidationPipe } from '@nestjs/common';
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

  // Enable CORS for frontend integrations
  app.enableCors();

  // Request ID injection middleware
  app.use(new RequestIdMiddleware().use);

  // Global payload validation configurations
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Standard successful responses formatter interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Centralized exceptions filter
  app.useGlobalFilters(new GlobalExceptionFilter());

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
        'Basic realm="RelayFlow Swagger Documentation"',
      );
      return res
        .status(401)
        .send('Authentication required to access API Documentation');
    },
  );

  const config = new DocumentBuilder()
    .setTitle('RelayFlow REST API')
    .setDescription(
      'Stateless HTTP Gateway and REST boundaries for RelayFlow realtime platform',
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'Input your Bearer JWT token to access authenticated REST routes',
    })
    .addTag('System Health', 'API health status endpoints')
    .addTag('Authentication', 'User authentication and tokens')
    .addTag('Users', 'User profile and friend management')
    .addTag('Groups (Channels & Members)', 'Group and channel operations')
    .addTag(
      'Chat & Conversations',
      'Direct messages and group chat interactions',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      operationsSorter: 'alpha',
    },
  });
  // -------------------------------------------------------------

  const port = process.env.GATEWAY_PORT ?? process.env.PORT ?? 4001;
  await app.listen(port);

  Logger.log(
    `🚀 RelayFlow Gateway is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `📖 REST API Documentation is available at: http://localhost:${port}/docs`,
  );
}

bootstrap().catch((err: unknown) => {
  Logger.error('❌ Application bootstrap failed', err);
});
