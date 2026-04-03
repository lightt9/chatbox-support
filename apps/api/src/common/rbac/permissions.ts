/**
 * RBAC Permission System
 *
 * Roles hierarchy (highest to lowest):
 *   server_admin > company_admin > manager > agent
 *
 * server_admin = super_admin (backward compat alias)
 * company_admin = admin (backward compat alias)
 */

export const ROLE_HIERARCHY: Record<string, number> = {
  server_admin: 100,
  super_admin: 100,  // alias
  company_admin: 80,
  admin: 80,         // alias
  manager: 60,
  agent: 40,
};

export type Permission =
  | 'company:manage'
  | 'company:view'
  | 'conversations:view_all'
  | 'conversations:view_assigned'
  | 'conversations:reply'
  | 'conversations:assign'
  | 'conversations:resolve'
  | 'conversations:escalate'
  | 'operators:manage'
  | 'operators:view'
  | 'settings:manage'
  | 'widget:manage'
  | 'knowledge_base:manage'
  | 'reports:view'
  | 'quality:manage'
  | 'leads:manage';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  server_admin: [
    'company:manage', 'company:view',
    'conversations:view_all', 'conversations:reply', 'conversations:assign', 'conversations:resolve', 'conversations:escalate',
    'operators:manage', 'operators:view',
    'settings:manage', 'widget:manage', 'knowledge_base:manage',
    'reports:view', 'quality:manage', 'leads:manage',
  ],
  company_admin: [
    'company:view',
    'conversations:view_all', 'conversations:reply', 'conversations:assign', 'conversations:resolve', 'conversations:escalate',
    'operators:manage', 'operators:view',
    'settings:manage', 'widget:manage', 'knowledge_base:manage',
    'reports:view', 'quality:manage', 'leads:manage',
  ],
  manager: [
    'company:view',
    'conversations:view_all', 'conversations:reply', 'conversations:assign', 'conversations:resolve', 'conversations:escalate',
    'operators:view',
    'knowledge_base:manage',
    'reports:view', 'leads:manage',
  ],
  agent: [
    'conversations:view_all', 'conversations:view_assigned',
    'conversations:reply', 'conversations:resolve',
  ],
};

// Aliases
ROLE_PERMISSIONS['super_admin'] = ROLE_PERMISSIONS['server_admin'];
ROLE_PERMISSIONS['admin'] = ROLE_PERMISSIONS['company_admin'];

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function normalizeRole(role: string): string {
  if (role === 'super_admin') return 'server_admin';
  if (role === 'admin') return 'company_admin';
  return role;
}

export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

export function isAtLeast(userRole: string, requiredRole: string): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}
