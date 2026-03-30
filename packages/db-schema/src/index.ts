import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// ── Re-export all schemas ───────────────────────────────────────────────────

export * from './schema/companies';
export * from './schema/knowledge-base';
export * from './schema/customers';
export * from './schema/conversations';
export * from './schema/flows';
export * from './schema/operators';
export * from './schema/admin';
export * from './schema/reports';
export * from './schema/audit';

// ── Import all schemas for the drizzle instance ─────────────────────────────

import * as companiesSchema from './schema/companies';
import * as knowledgeBaseSchema from './schema/knowledge-base';
import * as customersSchema from './schema/customers';
import * as conversationsSchema from './schema/conversations';
import * as flowsSchema from './schema/flows';
import * as operatorsSchema from './schema/operators';
import * as adminSchema from './schema/admin';
import * as reportsSchema from './schema/reports';
import * as auditSchema from './schema/audit';

const schema = {
  ...companiesSchema,
  ...knowledgeBaseSchema,
  ...customersSchema,
  ...conversationsSchema,
  ...flowsSchema,
  ...operatorsSchema,
  ...adminSchema,
  ...reportsSchema,
  ...auditSchema,
};

// ── Database connection helper ──────────────────────────────────────────────

export function createDb(connectionString?: string) {
  const pool = new Pool({
    connectionString: connectionString ?? process.env.DATABASE_URL,
  });

  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDb>;
