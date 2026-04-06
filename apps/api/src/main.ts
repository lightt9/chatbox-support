import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
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

const keepAlive = setInterval(() => {}, 30_000);
const startupTimeout = setTimeout(() => {
  console.error('[FATAL] Startup timed out after 90s');
  process.exit(1);
}, 90_000);

async function bootstrap() {
  const port = process.env.PORT || process.env.API_PORT || 3001;
  console.log('[boot] port=' + port + ' env=' + process.env.NODE_ENV);

  // Step 1: Create (does NOT resolve routes)
  console.log('[boot] step 1: NestFactory.create...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  console.log('[boot] step 1 done');

  // Step 2: Middleware
  console.log('[boot] step 2: middleware...');
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
  console.log('[boot] step 2 done');

  // Step 3: Init (resolves routes + gateways)
  console.log('[boot] step 3: app.init...');
  await app.init();
  console.log('[boot] step 3 done');

  // Step 4: Listen
  console.log('[boot] step 4: listen on ' + port + '...');
  const server = app.getHttpServer();
  server.listen(Number(port), '0.0.0.0', () => {
    clearInterval(keepAlive);
    clearTimeout(startupTimeout);
    console.log('[boot] READY on port ' + port);
  });
}

bootstrap().catch((err) => {
  clearInterval(keepAlive);
  clearTimeout(startupTimeout);
  console.error('[boot] FATAL:', err);
  process.exit(1);
});
