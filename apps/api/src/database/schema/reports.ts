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
import { adminUsers } from './admin';

// ── Reports ─────────────────────────────────────────────────────────────────

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    created_by: uuid('created_by').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'conversation_volume' | 'resolution_time' | 'satisfaction' | 'operator_performance' | 'ai_accuracy' | 'custom'
    config: jsonb('config').notNull().default({}),
    filters: jsonb('filters').default({}),
    schedule: text('schedule'), // cron expression for scheduled reports
    last_run_at: timestamp('last_run_at', { withTimezone: true }),
    result: jsonb('result'),
    format: text('format').notNull().default('json'), // 'json' | 'csv' | 'pdf'
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('reports_company_id_idx').on(table.company_id),
    index('reports_type_idx').on(table.type),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────

export const reportsRelations = relations(reports, ({ one }) => ({
  company: one(companies, {
    fields: [reports.company_id],
    references: [companies.id],
  }),
  createdBy: one(adminUsers, {
    fields: [reports.created_by],
    references: [adminUsers.id],
  }),
}));
