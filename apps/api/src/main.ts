import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import * as compression from 'compression';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  console.log('>>> Starting NestJS bootstrap...');
  console.log('>>> PORT env:', process.env.PORT);
  console.log('>>> NODE_ENV:', process.env.NODE_ENV);
  console.log('>>> DATABASE_URL set:', !!process.env.DATABASE_URL);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  console.log('>>> App created successfully');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || configService.get<number>('API_PORT', 3001);
  console.log('>>> Will listen on port:', port);

  const uploadsDir = join(process.cwd(), 'uploads');
  const fs = require('fs');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable WebSocket with Socket.IO
  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port, '0.0.0.0');
  logger.log(`ChatBox-Support API is running on port ${port}`);
  logger.log(`WebSocket gateway available on port ${port}/chat`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
