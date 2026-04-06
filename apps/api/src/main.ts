import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import { join } from 'path';
import * as fs from 'fs';
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

// Keep process alive
setInterval(() => {}, 10_000);

async function bootstrap() {
  const port = Number(process.env.PORT || process.env.API_PORT || 3001);
  console.log('[boot] port=' + port + ' node=' + process.version);
  console.log('[boot] JWT_SECRET set=' + !!process.env.JWT_SECRET);
  console.log('[boot] DATABASE_URL set=' + !!process.env.DATABASE_URL);

  console.log('[boot] creating app...');
  const t0 = Date.now();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
    abortOnError: true,
  });
  console.log('[boot] app created in ' + (Date.now() - t0) + 'ms');

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  app.use((compression as any)());

  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((s) => s.trim()) : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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

  console.log('[boot] calling listen...');
  await app.listen(port, '0.0.0.0');
  console.log('[boot] READY on port ' + port);
}

bootstrap().catch((err) => {
  console.error('[boot] FATAL:', err);
  process.exit(1);
});
