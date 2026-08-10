# LearnEC Phase A Authentication and Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver database-backed ADMIN/STUDENT authentication, student-account administration, and isolated management/student application shells.

**Architecture:** Prisma is the sole source of truth for users, role grants, and sessions. The browser receives only a HttpOnly session cookie plus a CSRF cookie; route middleware improves navigation but server helpers enforce every protected API. New `/admin/**` and `/center/**` shells replace the legacy workspace entry points, while `/practicum/**` only redirects for compatibility.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript, Nitro/H3, Prisma 6, PostgreSQL, Playwright.

## Global Constraints

- Implement only Phase A; do not add work orders, resource catalog, sandbox, submissions, grading, analytics, or competition engines.
- Use only `ADMIN` and `STUDENT`; legacy `OWNER`, `TEACHER`, and `MENTOR` map to `ADMIN` only while reading legacy contexts.
- `User`, `UserRoleGrant`, and `AuthSession` are Prisma/PostgreSQL data; do not use localStorage or JSON files as authentication or business data.
- Seed exactly `admin` and `student1`; their passwords are supplied through ignored environment variables and are never returned or logged.
- Management navigation has five top-level entries: work center, tasks, reviews, competitions, data. Student navigation has four: home, assignments, practicum, data.
- Every state-changing request requires CSRF validation and all admin account mutations write an audit event.

---

### Task 1: Define the Phase A data contract

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260810090000_learnec_phase_a_auth/migration.sql`
- Create: `prisma/seed.mjs`
- Modify: `package.json`, `.env.example`
- Test: `tests/e2e/practicum/phase-a-v2.spec.ts`

- [ ] Add `UserRole { ADMIN STUDENT }`, `User`, `UserRoleGrant`, and `AuthSession`, with unique normalized identifier, password salt/hash, enabled status, role grants, active role, expiry, CSRF token, and optional organization/room context.
- [ ] Add a seed that rejects missing `SEED_ADMIN_PASSWORD` or `SEED_STUDENT1_PASSWORD`, hashes both passwords, and upserts only the two documented accounts and their role grants.
- [ ] Make a migration from the existing PostgreSQL schema and generate Prisma Client.
- [ ] Add a failing test asserting `/api/auth/login` rejects legacy credentials and that seeded `admin` can establish an `ADMIN` session.

### Task 2: Replace file authentication with Prisma session services

**Files:**
- Modify: `server/utils/auth-store.ts`, `server/utils/auth-session.ts`, `server/middleware/csrf.ts`
- Modify: `server/api/auth/login.post.ts`, `server/api/auth/session.get.ts`, `server/api/auth/switch-role.post.ts`, `server/api/auth/logout.post.ts`, `server/api/auth/profile.patch.ts`
- Modify: `domain/practicum/types.ts`, `domain/practicum/permissions.ts`, `composables/useAuthSession.ts`
- Test: `tests/e2e/practicum/phase-a-v2.spec.ts`

- [ ] Write failing tests for invalid credentials, disabled accounts, refresh-persistent sessions, logout revocation, and rejection of an unauthorized role switch.
- [ ] Replace JSON reads/writes with Prisma queries, `scrypt` password verification, token hashing, expiry validation, and constant-time verification where secret comparisons are required.
- [ ] Return the safe session shape `{ id, identifier, displayName, role, authorizedRoles, roomIds }` only; never expose password hashes, salts, raw session tokens, or CSRF tokens in JSON.
- [ ] Keep legacy-role compatibility centralized in a conversion helper rather than preserving legacy roles in the new database enum.

### Task 3: Add server-authorized student account management

**Files:**
- Create: `server/utils/authorization.ts`
- Create: `server/api/admin/accounts/index.get.ts`, `server/api/admin/accounts/index.post.ts`
- Create: `server/api/admin/accounts/[id]/status.patch.ts`, `server/api/admin/accounts/[id]/reset-password.post.ts`
- Modify: `server/middleware/csrf.ts`
- Test: `tests/e2e/practicum/phase-a-v2.spec.ts`

- [ ] Write failing API tests that a student receives `403`, an admin can create only a unique student identifier, and disable/reset operations target only student users.
- [ ] Implement `requireAdmin`, `requireStudent`, and scoped-context helpers. Account generation hashes a temporary password, returns it once in the response, and records an `AuditEvent` without the password.
- [ ] Extend CSRF coverage from legacy practicum writes to `/api/admin/**` writes.

### Task 4: Build the two isolated shells and account page

**Files:**
- Create: `pages/login.vue`, `pages/admin/index.vue`, `pages/admin/accounts.vue`, `pages/center/index.vue`
- Create: `components/learnec/AppShell.vue`, `components/learnec/PlaceholderPage.vue`, `components/learnec/AdminAccountManager.vue`
- Modify: `middleware/practicum-auth.global.ts`, `pages/center.vue`
- Test: `tests/e2e/practicum/phase-a-v2.spec.ts`

- [ ] Write failing UI tests for the fixed five/four menu keys, unauthenticated redirect to `/login`, student denial for `/admin/accounts`, and account creation/disable/reset via the management UI.
- [ ] Implement server-session-aware login and role redirects: `ADMIN -> /admin`, `STUDENT -> /center`.
- [ ] Render only Phase A account management as a real management function. The task/review/competition/data routes are honest shell placeholders and must not claim later-stage completion.
- [ ] Redirect every legacy `/practicum/**` entry to the appropriate new root and retain no legacy permission UI as an active application entry.

### Task 5: Verify the Phase A business path

**Files:**
- Modify: `docs/acceptance-test-report.md`

- [ ] Run the focused Phase A Playwright suite against an isolated PostgreSQL database and record the exact pass/fail count.
- [ ] Run `npm.cmd run typecheck` and `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`; record exact exit codes.
- [ ] Start `npm.cmd run dev -- --host 127.0.0.1 --port 4310`, confirm the login page is available, and leave the service running for acceptance.
