import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import compression from 'compression';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Catch silent crashes
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
  process.exit(1);
});

// Keep-alive + startup timeout
const keepAlive = setInterval(() => {}, 30_000);
const startupTimeout = setTimeout(() => {
  console.error('[FATAL] Startup timed out after 60s — killing process');
  process.exit(1);
}, 60_000);

async function bootstrap() {
  const port = process.env.PORT || process.env.API_PORT || 3001;
  console.log('[boot] port=' + port + ' node_env=' + process.env.NODE_ENV);
  console.log('[boot] db=' + !!process.env.DATABASE_URL + ' ws_disabled=' + (process.env.DISABLE_WEBSOCKET === 'true'));

  try {
    console.log('[boot] creating app...');
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    console.log('[boot] app created OK');

    const uploadsDir = join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

    app.use(compression());

    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    if (process.env.DISABLE_WEBSOCKET !== 'true') {
      app.useWebSocketAdapter(new IoAdapter(app));
      console.log('[boot] WebSocket adapter set');
    }

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    console.log('[boot] calling listen on port ' + port);
    await app.listen(Number(port), '0.0.0.0');
    clearInterval(keepAlive);
    clearTimeout(startupTimeout);
    console.log('[boot] READY on port ' + port);
  } catch (err) {
    clearInterval(keepAlive);
    clearTimeout(startupTimeout);
    console.error('[boot] FATAL bootstrap error:', err);
    process.exit(1);
  }
}

bootstrap();
