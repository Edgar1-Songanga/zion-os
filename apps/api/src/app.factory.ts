import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function createZionApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api');

  const configuredOrigins = (process.env.ZION_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
    throw new Error('ZION_ALLOWED_ORIGINS must be configured in production');
  }

  app.enableCors({
    origin: configuredOrigins.length ? configuredOrigins : true,
    credentials: true,
  });

  await app.init();
  return app;
}
