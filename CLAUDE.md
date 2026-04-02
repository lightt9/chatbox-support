# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**ChatBox-Support** is a multi-channel customer support platform built as a monorepo with Turborepo + pnpm.

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS at `apps/admin/`
- **Backend**: NestJS 11 + Drizzle ORM + PostgreSQL at `apps/api/`
- **Shared packages**: `packages/db-schema`, `packages/shared-types`, `packages/utils`, `packages/channel-sdk`

## Running the Project

```bash
# Prerequisites: Docker Desktop running, Node >= 20, pnpm
pnpm install
pnpm docker:up                    # Start Postgres, Redis, MinIO, Mailhog
pnpm --filter @chatbox/api seed   # Seed demo data
pnpm dev                          # Start all dev servers via Turbo

# Note: If port 3000 is occupied, admin runs on 3002
# API: http://localhost:3001
# Admin: http://localhost:3000 (or 3002)
```

**Default login**: `admin@chatbox.local` / `Admin123!`

## Architecture

```
apps/
  admin/          Next.js 15 admin dashboard (App Router, client components)
  api/            NestJS 11 REST API
packages/
  db-schema/      Drizzle ORM schema definitions (shared)
  shared-types/   TypeScript type definitions
  utils/          Shared utilities
  channel-sdk/    Channel integration SDK
infrastructure/
  docker/         Docker Compose (Postgres, Redis, MinIO, Mailhog)
```

## Backend Patterns

- **Database**: Drizzle ORM with `@Inject(DATABASE)` or `@Inject(DB_POOL)` for raw queries
- **Auth**: JWT via Passport (`JwtAuthGuard`), user in `req.user` with `{ id, email, role, companyId }`
- **Decorators**: `@CurrentUser()` for user, `@Roles('super_admin')` for role-based access
- **DTOs**: class-validator with `whitelist: true` + `forbidNonWhitelisted: true` globally
- **Module pattern**: Each feature is a NestJS module in `src/modules/<name>/`
- **API prefix**: All routes under `/api/v1/`
- **File uploads**: Multer to `uploads/` directory, served as static assets

## Frontend Patterns

- **API client**: `src/lib/api.ts` — typed `ApiClient` with auto token refresh on 401
- **Auth**: `src/lib/auth.tsx` — `AuthProvider` context with `useAuth()` hook
- **Theme**: `src/lib/theme.tsx` — `ThemeProvider` with dark/light/system + primary color
- **Routing**: Next.js App Router, dashboard pages under `app/dashboard/`
- **Layout**: `app/dashboard/layout.tsx` — sidebar + topbar, protected by auth guard
- **Styling**: Tailwind CSS with shadcn-style CSS variables (--primary, --muted, etc.)
- **Toast**: Each page implements its own Toast component for feedback

## Key Conventions

- **Immutability**: Always create new objects, never mutate existing ones
- **Error handling**: Handle errors at every level, show user-friendly messages
- **File size**: <400 lines typical, <800 max
- **Functions**: <50 lines
- **No console.log**: Use proper logging or remove before commit
- **No hardcoded secrets**: Use environment variables
- **Input validation**: Validate at system boundaries (DTOs on backend, form validation on frontend)

## Database

- PostgreSQL 16 with pgvector extension (Docker: `chatbox-postgres`)
- Connection: `DATABASE_URL=postgresql://chatbox:chatbox_secret@localhost:5432/chatbox_dev`
- Schema defined in both `packages/db-schema/` and `apps/api/src/database/schema/`
- Migration via `apps/api/src/database/create-tables.sql`
- Seed via `pnpm --filter @chatbox/api seed`

## Testing

```bash
pnpm --filter @chatbox/api test      # API tests (Vitest)
```

## Environment Variables

All env vars in root `.env` — symlinked to `apps/api/.env`. Key vars:
- `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `API_PORT=3001`, `ADMIN_PORT=3000`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (optional, for Google OAuth)

## Existing Modules

| Module | Backend Routes | Frontend Page |
|--------|---------------|---------------|
| Auth | `/api/v1/auth/*` | `/login` |
| Settings | `/api/v1/settings/*` | `/dashboard/settings` |
| Quality | `/api/v1/quality/*` | `/dashboard/quality` |
| Leads | `/api/v1/leads/*` | `/dashboard/leads` |
| Companies | `/api/v1/companies/*` | `/dashboard/companies` |
| Conversations | `/api/v1/conversations/*` | `/dashboard/conversations` |
| Knowledge Base | `/api/v1/knowledge-base/*` | `/dashboard/knowledge-base` |
| Operators | - | `/dashboard/operators` |
| Reports | `/api/v1/reports/*` | `/dashboard/reports` |

## When Adding New Features

1. Create NestJS module: `src/modules/<name>/` with controller, service, DTOs, module
2. Register in `src/app.module.ts`
3. Create frontend page: `app/dashboard/<name>/page.tsx`
4. Add to sidebar nav in `app/dashboard/layout.tsx`
5. Use `api.get/post/patch/delete` from `src/lib/api.ts` for API calls
6. Add loading/error/empty states to every page
