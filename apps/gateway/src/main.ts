// Load workspace .env before all other imports so process.env is populated

require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});

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
  // Swagger Documentation Setup
  // -------------------------------------------------------------
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
