import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const REDIS = 'REDIS';

const logger = new Logger('RedisModule');

// Minimal no-op Redis client for when Redis is not available
const noopRedis = new Proxy({} as any, {
  get: (_target, prop) => {
    if (prop === 'status') return 'noop';
    if (prop === 'on' || prop === 'once') return () => noopRedis;
    return (..._args: any[]) => Promise.resolve(null);
  },
});

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST');

        if (!redisUrl && !redisHost) {
          logger.warn('Redis not configured — running without cache');
          return noopRedis;
        }

        try {
          const Redis = require('ioredis');
          if (redisUrl) {
            return new Redis(redisUrl);
          }
          return new Redis({
            host: redisHost || 'localhost',
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
            db: configService.get<number>('REDIS_DB', 0),
          });
        } catch {
          logger.warn('Redis connection failed — running without cache');
          return noopRedis;
        }
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
