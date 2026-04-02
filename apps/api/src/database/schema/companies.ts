import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  smallint,
  integer,
  jsonb,
  time,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Companies ───────────────────────────────────────────────────────────────

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo_url: text('logo_url'),
  website: text('website'),
  default_language: text('default_language').notNull().default('en'),
  timezone: text('timezone').notNull().default('UTC'),
  plan: text('plan').notNull().default('free'),
  max_operators: integer('max_operators').notNull().default(1),
  settings: jsonb('settings').default({}),
  active: boolean('active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Company Schedules ───────────────────────────────────────────────────────

export const companySchedules = pgTable('company_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  day_of_week: smallint('day_of_week').notNull(), // 0=Sun, 6=Sat
  open_time: time('open_time').notNull(),
  close_time: time('close_time').notNull(),
  is_closed: boolean('is_closed').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Company Channels ────────────────────────────────────────────────────────

export const companyChannels = pgTable('company_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  channel_type: text('channel_type').notNull(), // 'web_chat' | 'whatsapp' | 'telegram' | 'email' | 'sms'
  enabled: boolean('enabled').notNull().default(true),
  credentials: jsonb('credentials').default({}),
  settings: jsonb('settings').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations ───────────────────────────────────────────────────────────────

export const companiesRelations = relations(companies, ({ many }) => ({
  schedules: many(companySchedules),
  channels: many(companyChannels),
}));

export const companySchedulesRelations = relations(companySchedules, ({ one }) => ({
  company: one(companies, {
    fields: [companySchedules.company_id],
    references: [companies.id],
  }),
}));

export const companyChannelsRelations = relations(companyChannels, ({ one }) => ({
  company: one(companies, {
    fields: [companyChannels.company_id],
    references: [companies.id],
  }),
}));
