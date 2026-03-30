import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { companies } from './companies';

// ── Operators ───────────────────────────────────────────────────────────────

export const operators = pgTable(
  'operators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name').notNull(),
    avatar_url: text('avatar_url'),
    role: text('role').notNull().default('agent'), // 'agent' | 'supervisor' | 'admin'
    status: text('status').notNull().default('offline'), // 'online' | 'away' | 'busy' | 'offline'
    max_concurrent_chats: integer('max_concurrent_chats').notNull().default(5),
    skills: jsonb('skills').default([]),
    languages: jsonb('languages').default(['en']),
    active: boolean('active').notNull().default(true),
    last_active_at: timestamp('last_active_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('operators_company_id_idx').on(table.company_id),
    index('operators_email_idx').on(table.email),
    index('operators_status_idx').on(table.status),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────

export const operatorsRelations = relations(operators, ({ one }) => ({
  company: one(companies, {
    fields: [operators.company_id],
    references: [companies.id],
  }),
}));
