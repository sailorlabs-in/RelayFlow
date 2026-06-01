// Load workspace .env before all other imports so process.env is populated
 
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

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
  // Swagger Documentation Setup
  // -------------------------------------------------------------
  const config = new DocumentBuilder()
    .setTitle('RelayFlow Worker Service API')
    .setDescription('Worker Service OpenAPI documentation for RelayFlow platform background job processing')
    .setVersion('1.0')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  // -------------------------------------------------------------
  
  const port = process.env.WORKER_PORT ?? process.env.PORT ?? 4002;
  await app.listen(port);
  
  Logger.log(
    `🚀 RelayFlow Worker Service is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📖 Worker API Documentation is available at: http://localhost:${port}/docs`
  );
}

bootstrap().catch((err: unknown) => {
  Logger.error('❌ Worker-service bootstrap failed', err);
});

