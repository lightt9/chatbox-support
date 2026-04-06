import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express');

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
  process.exit(1);
});

async function bootstrap() {
  const port = Number(process.env.PORT || process.env.API_PORT || 3001);
  console.log('[boot] port=' + port + ' env=' + process.env.NODE_ENV);

  // Express listens immediately
  const expressApp = express();
  expressApp.get('/health', (_req: any, res: any) => res.json({ status: 'ok' }));
  expressApp.listen(port, '0.0.0.0', () => {
    console.log('[boot] express on port ' + port);
  });

  // Create NestJS with full debug logging
  console.log('[boot] NestFactory.create...');
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  console.log('[boot] create done');

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  app.use(compression());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  console.log('[boot] app.init...');
  await app.init();
  console.log('[boot] READY');
}

bootstrap().catch((err) => {
  console.error('[boot] FATAL:', err);
  process.exit(1);
});
