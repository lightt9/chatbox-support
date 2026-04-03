import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';

export const DATABASE = 'DATABASE';
export const DB_POOL = 'DB_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const useSSL = connectionString?.includes('supabase.co') || isProduction;

        return new Pool({
          connectionString,
          max: configService.get<number>('DB_POOL_MAX', 20),
          ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
        });
      },
    },
    {
      provide: DATABASE,
      inject: [DB_POOL],
      useFactory: (pool: Pool) => {
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DATABASE, DB_POOL],
})
export class DatabaseModule {}
