import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { join } from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

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

  // Create express + HTTP server FIRST so the port opens immediately
  const server = express();
  const httpServer = http.createServer(server);

  // Health endpoint available before Nest finishes
  server.get('/health', (_req, res) => res.json({ status: 'starting' }));

  // Open the port IMMEDIATELY so Render sees it
  httpServer.listen(port, '0.0.0.0', () => {
    console.log('[boot] HTTP server listening on port ' + port);
  });

  // Now create NestJS on top of the existing express instance
  console.log('[boot] creating NestJS app...');
  const adapter = new ExpressAdapter(server);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });
  console.log('[boot] NestJS app created');

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

  console.log('[boot] initializing routes...');
  await app.init();
  console.log('[boot] READY — all routes initialized');
}

bootstrap().catch((err) => {
  console.error('[boot] FATAL:', err);
  process.exit(1);
});
