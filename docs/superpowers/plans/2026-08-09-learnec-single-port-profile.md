# LearnEC Single-Port Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the real LearnEC workbench at port 4310 and provide authenticated avatar-menu profile actions.

**Architecture:** The existing Nuxt application remains the only UI and API server. Profile editing is added to the existing authenticated session contract and persisted through the existing data source; the topbar consumes that contract without cross-origin requests.

**Tech Stack:** Nuxt 3, Vue 3, Nitro/H3, Prisma, PostgreSQL, Playwright.

## Global Constraints

- Keep port 4310 as the only browser-facing development server.
- Do not delete source files, database volumes, migrations, or unrelated working-tree changes.
- All writes require the existing authenticated session and CSRF header.

### Task 1: Profile Contract

**Files:** `server/api/auth/profile.get.ts`, `server/api/auth/profile.patch.ts`, `server/utils/auth-store.ts`, `composables/useAuthSession.ts`, `tests/e2e/practicum/auth-session.spec.ts`.

- [ ] Write a failing authenticated API test for reading and changing the display name.
- [ ] Implement validated, CSRF-protected profile read/update methods that return the public user object.
- [ ] Reload the client auth state from the update response and run the focused auth suite.

### Task 2: Avatar Menu And Profile Screen

**Files:** `components/practicum/PracticumTopbar.vue`, `pages/practicum/profile.vue`, `tests/e2e/practicum/shell.spec.ts`.

- [ ] Write failing browser tests for profile view/edit navigation, persistence after reload, authorized role switching, and logout.
- [ ] Add the avatar-menu actions and an accessible editing form while preserving existing role and logout controls.
- [ ] Run focused browser tests at the 4310 base URL, including a 390px viewport.

### Task 3: Single-Port Runtime

**Files:** `scripts/ensure-dev-env.js`, `start-server.bat`, relevant runtime tests.

- [ ] Write a failing runtime contract that expects the real application command to bind 4310 and no page server on 3000.
- [ ] Update launch scripts and environment handling so `DATABASE_URL` is taken from the project `.env`, not a stale shell variable.
- [ ] Start PostgreSQL, migrate non-destructively if required, build, launch 4310, then stop the obsolete 3000 frontend process.
