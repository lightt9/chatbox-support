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

// ── Conversation Flows ──────────────────────────────────────────────────────

export const conversationFlows = pgTable(
  'conversation_flows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    trigger_type: text('trigger_type').notNull(), // 'keyword' | 'intent' | 'event' | 'schedule'
    trigger_config: jsonb('trigger_config').notNull().default({}),
    steps: jsonb('steps').notNull().default([]),
    active: boolean('active').notNull().default(true),
    priority: integer('priority').notNull().default(0),
    version: integer('version').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('conversation_flows_company_id_idx').on(table.company_id),
    index('conversation_flows_trigger_type_idx').on(table.trigger_type),
  ],
);

// ── Escalation Rules ────────────────────────────────────────────────────────

export const escalationRules = pgTable(
  'escalation_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    condition_type: text('condition_type').notNull(), // 'sentiment' | 'keyword' | 'confidence' | 'time' | 'custom'
    condition_config: jsonb('condition_config').notNull().default({}),
    action: text('action').notNull().default('assign_operator'), // 'assign_operator' | 'notify' | 'transfer_queue'
    action_config: jsonb('action_config').notNull().default({}),
    priority: integer('priority').notNull().default(0),
    active: boolean('active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('escalation_rules_company_id_idx').on(table.company_id),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────

export const conversationFlowsRelations = relations(conversationFlows, ({ one }) => ({
  company: one(companies, {
    fields: [conversationFlows.company_id],
    references: [companies.id],
  }),
}));

export const escalationRulesRelations = relations(escalationRules, ({ one }) => ({
  company: one(companies, {
    fields: [escalationRules.company_id],
    references: [companies.id],
  }),
}));
