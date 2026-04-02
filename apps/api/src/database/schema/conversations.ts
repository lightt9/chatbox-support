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
import { customers } from './customers';
import { operators } from './operators';

// ── Conversations ───────────────────────────────────────────────────────────

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    customer_id: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    assigned_operator_id: uuid('assigned_operator_id').references(() => operators.id, {
      onDelete: 'set null',
    }),
    channel: text('channel').notNull(), // 'web_chat' | 'whatsapp' | 'telegram' | 'email' | 'sms'
    status: text('status').notNull().default('open'), // 'open' | 'pending' | 'resolved' | 'closed'
    priority: text('priority').notNull().default('normal'), // 'low' | 'normal' | 'high' | 'urgent'
    subject: text('subject'),
    language: text('language').default('en'),
    tags: jsonb('tags').default([]),
    metadata: jsonb('metadata').default({}),
    ai_handled: boolean('ai_handled').notNull().default(true),
    escalated: boolean('escalated').notNull().default(false),
    escalated_at: timestamp('escalated_at', { withTimezone: true }),
    satisfaction_rating: integer('satisfaction_rating'),
    satisfaction_comment: text('satisfaction_comment'),
    message_count: integer('message_count').notNull().default(0),
    last_message_at: timestamp('last_message_at', { withTimezone: true }),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('conversations_company_id_idx').on(table.company_id),
    index('conversations_customer_id_idx').on(table.customer_id),
    index('conversations_status_idx').on(table.status),
    index('conversations_assigned_operator_id_idx').on(table.assigned_operator_id),
    index('conversations_channel_idx').on(table.channel),
    index('conversations_created_at_idx').on(table.created_at),
  ],
);

// ── Messages ────────────────────────────────────────────────────────────────

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversation_id: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    sender_type: text('sender_type').notNull(), // 'customer' | 'ai' | 'operator' | 'system'
    sender_id: uuid('sender_id'),
    content: text('content').notNull(),
    content_type: text('content_type').notNull().default('text'), // 'text' | 'html' | 'image' | 'file' | 'template'
    attachments: jsonb('attachments').default([]),
    metadata: jsonb('metadata').default({}),
    ai_confidence: integer('ai_confidence'), // 0-100
    kb_entry_ids: jsonb('kb_entry_ids').default([]),
    edited: boolean('edited').notNull().default(false),
    deleted: boolean('deleted').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_conversation_id_idx').on(table.conversation_id),
    index('messages_sender_type_idx').on(table.sender_type),
    index('messages_created_at_idx').on(table.created_at),
  ],
);

// ── Relations ───────────────────────────────────────────────────────────────

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  company: one(companies, {
    fields: [conversations.company_id],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [conversations.customer_id],
    references: [customers.id],
  }),
  assignedOperator: one(operators, {
    fields: [conversations.assigned_operator_id],
    references: [operators.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversation_id],
    references: [conversations.id],
  }),
}));
