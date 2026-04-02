-- ============================================
-- ChatBox - Support: Create Tables
-- Run against PostgreSQL to bootstrap the schema
-- ============================================

-- Enable uuid-ossp for gen_random_uuid() on older PG versions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Companies ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT          NOT NULL,
  slug          TEXT          NOT NULL UNIQUE,
  logo_url      TEXT,
  website       TEXT,
  default_language TEXT       NOT NULL DEFAULT 'en',
  timezone      TEXT          NOT NULL DEFAULT 'UTC',
  plan          TEXT          NOT NULL DEFAULT 'free',
  max_operators INTEGER       NOT NULL DEFAULT 1,
  settings      JSONB         DEFAULT '{}',
  active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Company Schedules ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_schedules (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  day_of_week   SMALLINT      NOT NULL,   -- 0=Sun, 6=Sat
  open_time     TIME          NOT NULL,
  close_time    TIME          NOT NULL,
  is_closed     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS company_schedules_company_id_idx
  ON company_schedules (company_id);

-- ── Company Channels ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_channels (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  channel_type  TEXT          NOT NULL,   -- 'web_chat' | 'whatsapp' | 'telegram' | 'email' | 'sms'
  enabled       BOOLEAN       NOT NULL DEFAULT TRUE,
  credentials   JSONB         DEFAULT '{}',
  settings      JSONB         DEFAULT '{}',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS company_channels_company_id_idx
  ON company_channels (company_id);

-- ── Admin Users ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_users (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email             TEXT          NOT NULL UNIQUE,
  name              TEXT          NOT NULL,
  password_hash     TEXT,
  role              TEXT          NOT NULL DEFAULT 'admin',   -- 'super_admin' | 'admin' | 'manager'
  avatar_url        TEXT,
  auth_provider     TEXT          DEFAULT 'local',            -- 'local' | 'google' | 'facebook' | 'apple'
  auth_provider_id  TEXT,
  active            BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_users_company_id_idx
  ON admin_users (company_id);

CREATE INDEX IF NOT EXISTS admin_users_email_idx
  ON admin_users (email);

-- ── Operators ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS operators (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email                 TEXT          NOT NULL,
  name                  TEXT          NOT NULL,
  password_hash         TEXT,
  avatar_url            TEXT,
  role                  TEXT          NOT NULL DEFAULT 'agent',     -- 'admin' | 'manager' | 'agent'
  status                TEXT          NOT NULL DEFAULT 'offline',   -- 'online' | 'away' | 'busy' | 'offline'
  phone                 TEXT,
  timezone              TEXT          DEFAULT 'UTC',
  language              TEXT          DEFAULT 'en',                 -- 'en' | 'ro' | 'ru'
  notes                 TEXT,
  max_concurrent_chats  INTEGER       NOT NULL DEFAULT 5,
  skills                JSONB         DEFAULT '[]',
  languages             JSONB         DEFAULT '["en"]',
  active                BOOLEAN       NOT NULL DEFAULT TRUE,
  last_active_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operators_company_id_idx ON operators (company_id);
CREATE INDEX IF NOT EXISTS operators_email_idx ON operators (email);
CREATE INDEX IF NOT EXISTS operators_status_idx ON operators (status);
CREATE UNIQUE INDEX IF NOT EXISTS operators_company_email_idx ON operators (company_id, email);

-- ── Teams ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT          NOT NULL,
  description   TEXT,
  active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS teams_company_id_idx ON teams (company_id);

-- ── Operator Teams (join table) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS operator_teams (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   UUID          NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  team_id       UUID          NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operator_teams_operator_id_idx ON operator_teams (operator_id);
CREATE INDEX IF NOT EXISTS operator_teams_team_id_idx ON operator_teams (team_id);
CREATE UNIQUE INDEX IF NOT EXISTS operator_teams_unique_idx ON operator_teams (operator_id, team_id);

-- ── Conversations ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  external_id   TEXT,
  name          TEXT,
  email         TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  metadata      JSONB         DEFAULT '{}',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id           UUID          NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_operator_id  UUID          REFERENCES operators(id) ON DELETE SET NULL,
  channel               TEXT          NOT NULL,
  status                TEXT          NOT NULL DEFAULT 'open',
  priority              TEXT          NOT NULL DEFAULT 'normal',
  subject               TEXT,
  language              TEXT          DEFAULT 'en',
  tags                  JSONB         DEFAULT '[]',
  metadata              JSONB         DEFAULT '{}',
  ai_handled            BOOLEAN       NOT NULL DEFAULT TRUE,
  escalated             BOOLEAN       NOT NULL DEFAULT FALSE,
  escalated_at          TIMESTAMPTZ,
  satisfaction_rating   INTEGER,
  satisfaction_comment  TEXT,
  message_count         INTEGER       NOT NULL DEFAULT 0,
  last_message_at       TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID          NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type       TEXT          NOT NULL,
  sender_id         UUID,
  content           TEXT          NOT NULL,
  content_type      TEXT          NOT NULL DEFAULT 'text',
  attachments       JSONB         DEFAULT '[]',
  metadata          JSONB         DEFAULT '{}',
  ai_confidence     INTEGER,
  kb_entry_ids      JSONB         DEFAULT '[]',
  edited            BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted           BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Leads ─────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS lead_seq START 1;

CREATE TABLE IF NOT EXISTS leads (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  display_id      TEXT          NOT NULL,
  name            TEXT          NOT NULL,
  email           TEXT,
  phone           TEXT,
  company_name    TEXT,
  title           TEXT,
  source          TEXT          NOT NULL DEFAULT 'chat_widget',
  status          TEXT          NOT NULL DEFAULT 'new',        -- 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  rating          TEXT          DEFAULT 'cold',                -- 'hot' | 'warm' | 'cold'
  assigned_to     UUID          REFERENCES operators(id) ON DELETE SET NULL,
  notes           TEXT,
  tags            JSONB         DEFAULT '[]',
  lost_reason     TEXT,
  converted_at    TIMESTAMPTZ,
  last_contacted  TIMESTAMPTZ,
  conversation_id UUID          REFERENCES conversations(id) ON DELETE SET NULL,
  first_message   TEXT,
  last_message    TEXT,
  message_count   INTEGER       NOT NULL DEFAULT 0,
  custom_fields   JSONB         DEFAULT '{}',
  intent          TEXT,
  score           INTEGER       DEFAULT 0,
  ai_summary      TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_company_id_idx ON leads (company_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);

-- ── Quality Tickets ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quality_tickets (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conversation_id   UUID          NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  reviewer_id       UUID          REFERENCES admin_users(id) ON DELETE SET NULL,
  operator_id       UUID          REFERENCES operators(id) ON DELETE SET NULL,
  status            TEXT          NOT NULL DEFAULT 'open',
  reason            TEXT          NOT NULL,
  score             INTEGER,
  notes             TEXT,
  findings          JSONB         DEFAULT '{}',
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
