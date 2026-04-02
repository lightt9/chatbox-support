import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
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
    password_hash: text('password_hash'),
    avatar_url: text('avatar_url'),
    role: text('role').notNull().default('agent'), // 'admin' | 'manager' | 'agent'
    status: text('status').notNull().default('offline'), // 'online' | 'away' | 'busy' | 'offline'
    phone: text('phone'),
    timezone: text('timezone').default('UTC'),
    language: text('language').default('en'), // 'en' | 'ro' | 'ru'
    notes: text('notes'),
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
    uniqueIndex('operators_company_email_idx').on(table.company_id, table.email),
  ],
);

// ── Teams ───────────────────────────────────────────────────────────────────

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    active: boolean('active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('teams_company_id_idx').on(table.company_id),
  ],
);

// ── Operator Teams (join table) ─────────────────────────────────────────────

export const operatorTeams = pgTable(
  'operator_teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operator_id: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'cascade' }),
    team_id: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('operator_teams_operator_id_idx').on(table.operator_id),
    index('operator_teams_team_id_idx').on(table.team_id),
    uniqueIndex('operator_teams_unique_idx').on(table.operator_id, table.team_id),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────

export const operatorsRelations = relations(operators, ({ one, many }) => ({
  company: one(companies, {
    fields: [operators.company_id],
    references: [companies.id],
  }),
  operatorTeams: many(operatorTeams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  company: one(companies, {
    fields: [teams.company_id],
    references: [companies.id],
  }),
  operatorTeams: many(operatorTeams),
}));

export const operatorTeamsRelations = relations(operatorTeams, ({ one }) => ({
  operator: one(operators, {
    fields: [operatorTeams.operator_id],
    references: [operators.id],
  }),
  team: one(teams, {
    fields: [operatorTeams.team_id],
    references: [teams.id],
  }),
}));
