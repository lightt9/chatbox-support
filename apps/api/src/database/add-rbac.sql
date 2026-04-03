-- Migration: Add multi-tenant RBAC support
-- Adds user_company_roles table for multi-company membership with per-company roles

-- Create the roles junction table
CREATE TABLE IF NOT EXISTS user_company_roles (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  company_id    UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role          TEXT          NOT NULL DEFAULT 'agent',
  active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Unique constraint: one role per user per company
CREATE UNIQUE INDEX IF NOT EXISTS user_company_roles_unique_idx
  ON user_company_roles (user_id, company_id);

CREATE INDEX IF NOT EXISTS user_company_roles_user_idx ON user_company_roles (user_id);
CREATE INDEX IF NOT EXISTS user_company_roles_company_idx ON user_company_roles (company_id);

-- Migrate existing admin_users into user_company_roles
-- This preserves the current single-company assignments
INSERT INTO user_company_roles (user_id, company_id, role, active)
SELECT id, company_id, role, active
FROM admin_users
WHERE NOT EXISTS (
  SELECT 1 FROM user_company_roles ucr
  WHERE ucr.user_id = admin_users.id AND ucr.company_id = admin_users.company_id
);

-- Add 'agent' as a valid role concept
-- Existing roles: super_admin, admin, manager
-- New role: agent (basic access)
COMMENT ON TABLE user_company_roles IS 'Maps users to companies with per-company roles: server_admin, company_admin, manager, agent';
