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
import { conversations } from './conversations';
import { operators } from './operators';

// ── Admin Users ─────────────────────────────────────────────────────────────

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    password_hash: text('password_hash'),
    role: text('role').notNull().default('admin'), // 'super_admin' | 'admin' | 'manager'
    avatar_url: text('avatar_url'),
    auth_provider: text('auth_provider').default('local'), // 'local' | 'google' | 'facebook' | 'apple'
    auth_provider_id: text('auth_provider_id'),
    active: boolean('active').notNull().default(true),
    last_login_at: timestamp('last_login_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('admin_users_company_id_idx').on(table.company_id),
    index('admin_users_email_idx').on(table.email),
  ],
);

// ── Quality Tickets ─────────────────────────────────────────────────────────

export const qualityTickets = pgTable(
  'quality_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    conversation_id: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    reviewer_id: uuid('reviewer_id').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    operator_id: uuid('operator_id').references(() => operators.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('open'), // 'open' | 'in_review' | 'resolved' | 'dismissed'
    reason: text('reason').notNull(), // 'low_satisfaction' | 'ai_error' | 'escalation' | 'manual'
    score: integer('score'), // 0-100
    notes: text('notes'),
    findings: jsonb('findings').default({}),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('quality_tickets_company_id_idx').on(table.company_id),
    index('quality_tickets_conversation_id_idx').on(table.conversation_id),
    index('quality_tickets_status_idx').on(table.status),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────

export const adminUsersRelations = relations(adminUsers, ({ one }) => ({
  company: one(companies, {
    fields: [adminUsers.company_id],
    references: [companies.id],
  }),
}));

export const qualityTicketsRelations = relations(qualityTickets, ({ one }) => ({
  company: one(companies, {
    fields: [qualityTickets.company_id],
    references: [companies.id],
  }),
  conversation: one(conversations, {
    fields: [qualityTickets.conversation_id],
    references: [conversations.id],
  }),
  reviewer: one(adminUsers, {
    fields: [qualityTickets.reviewer_id],
    references: [adminUsers.id],
  }),
  operator: one(operators, {
    fields: [qualityTickets.operator_id],
    references: [operators.id],
  }),
}));
