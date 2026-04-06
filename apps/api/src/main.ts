import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { join } from 'path';
import * as fs from 'fs';
import * as http from 'http';
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

  // Open a bare HTTP server FIRST so Render sees the port immediately
  const tempServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'starting' }));
  });

  await new Promise<void>((resolve) => {
    tempServer.listen(port, '0.0.0.0', () => {
      console.log('[boot] temp HTTP server on port ' + port);
      resolve();
    });
  });

  // Now create NestJS (this may take a while on slow CPUs)
  console.log('[boot] creating NestJS app...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
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

  // Close temp server, then start Nest on the same port
  console.log('[boot] closing temp server, starting Nest...');
  await new Promise<void>((resolve) => tempServer.close(() => resolve()));
  await app.listen(port, '0.0.0.0');
  console.log('[boot] READY on port ' + port);
}

bootstrap().catch((err) => {
  console.error('[boot] FATAL:', err);
  process.exit(1);
});
