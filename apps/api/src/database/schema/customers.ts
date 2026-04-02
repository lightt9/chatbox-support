import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { companies } from './companies';

// ── Customers ───────────────────────────────────────────────────────────────

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    external_id: text('external_id'),
    email: text('email'),
    phone: text('phone'),
    name: text('name'),
    avatar_url: text('avatar_url'),
    locale: text('locale').default('en'),
    timezone: text('timezone'),
    metadata: jsonb('metadata').default({}),
    tags: jsonb('tags').default([]),
    blocked: boolean('blocked').notNull().default(false),
    first_seen_at: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    last_seen_at: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('customers_company_id_idx').on(table.company_id),
    index('customers_email_idx').on(table.email),
    index('customers_external_id_idx').on(table.external_id),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────

export const customersRelations = relations(customers, ({ one }) => ({
  company: one(companies, {
    fields: [customers.company_id],
    references: [companies.id],
  }),
}));
