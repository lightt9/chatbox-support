import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { companies } from './companies';

// ── Audit Logs ──────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    actor_type: text('actor_type').notNull(), // 'admin' | 'operator' | 'system' | 'api'
    actor_id: uuid('actor_id'),
    action: text('action').notNull(), // 'create' | 'update' | 'delete' | 'login' | 'export' | etc.
    resource_type: text('resource_type').notNull(), // 'company' | 'operator' | 'conversation' | 'kb_entry' | etc.
    resource_id: uuid('resource_id'),
    changes: jsonb('changes').default({}),
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_company_id_idx').on(table.company_id),
    index('audit_logs_actor_type_idx').on(table.actor_type),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_resource_type_idx').on(table.resource_type),
    index('audit_logs_created_at_idx').on(table.created_at),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  company: one(companies, {
    fields: [auditLogs.company_id],
    references: [companies.id],
  }),
}));
