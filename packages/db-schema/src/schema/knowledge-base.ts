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

// ── KB Categories ───────────────────────────────────────────────────────────

export const kbCategories = pgTable('kb_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  parent_id: uuid('parent_id'),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  sort_order: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── KB Entries ──────────────────────────────────────────────────────────────

export const kbEntries = pgTable(
  'kb_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    category_id: uuid('category_id').references(() => kbCategories.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    content_html: text('content_html'),
    language: text('language').notNull().default('en'),
    tags: jsonb('tags').default([]),
    // Vector embedding stored as text for now; pgvector Drizzle support is evolving.
    // In production, use a custom column type or raw SQL for vector(1536).
    embedding: text('embedding'),
    status: text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived'
    version: integer('version').notNull().default(1),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    published_at: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    index('kb_entries_company_id_idx').on(table.company_id),
    index('kb_entries_category_id_idx').on(table.category_id),
    index('kb_entries_status_idx').on(table.status),
  ],
);

// ── KB Entry Versions ───────────────────────────────────────────────────────

export const kbEntryVersions = pgTable('kb_entry_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  entry_id: uuid('entry_id')
    .notNull()
    .references(() => kbEntries.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  content_html: text('content_html'),
  changed_by: uuid('changed_by'),
  change_summary: text('change_summary'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations ───────────────────────────────────────────────────────────────

export const kbCategoriesRelations = relations(kbCategories, ({ one, many }) => ({
  company: one(companies, {
    fields: [kbCategories.company_id],
    references: [companies.id],
  }),
  parent: one(kbCategories, {
    fields: [kbCategories.parent_id],
    references: [kbCategories.id],
    relationName: 'parentChild',
  }),
  children: many(kbCategories, { relationName: 'parentChild' }),
  entries: many(kbEntries),
}));

export const kbEntriesRelations = relations(kbEntries, ({ one, many }) => ({
  company: one(companies, {
    fields: [kbEntries.company_id],
    references: [companies.id],
  }),
  category: one(kbCategories, {
    fields: [kbEntries.category_id],
    references: [kbCategories.id],
  }),
  versions: many(kbEntryVersions),
}));

export const kbEntryVersionsRelations = relations(kbEntryVersions, ({ one }) => ({
  entry: one(kbEntries, {
    fields: [kbEntryVersions.entry_id],
    references: [kbEntries.id],
  }),
}));
