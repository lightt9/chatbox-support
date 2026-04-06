import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';

export const DATABASE = 'DATABASE';
export const DB_POOL = 'DB_POOL';

const logger = new Logger('DatabaseModule');

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        let connectionString = configService.get<string>('DATABASE_URL') || '';

        // Remove channel_binding parameter — not supported by node-pg
        connectionString = connectionString.replace(/[&?]channel_binding=[^&]*/g, '');

        logger.log('Connecting to database...');

        const pool = new Pool({
          connectionString,
          max: configService.get<number>('DB_POOL_MAX', 10),
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10_000,
          idleTimeoutMillis: 30_000,
        });

        // Test connection immediately
        try {
          const client = await pool.connect();
          const res = await client.query('SELECT 1 AS ok');
          client.release();
          logger.log('Database connected OK (result=' + res.rows[0]?.ok + ')');
        } catch (err) {
          logger.error('Database connection FAILED: ' + err);
          throw err;
        }

        return pool;
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
