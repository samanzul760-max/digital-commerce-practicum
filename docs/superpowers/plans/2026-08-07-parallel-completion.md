# Parallel Practicum Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining teacher, administrator, resource/data, and template/competition workflows with local Prisma persistence and a single integrated role-aware experience.

**Architecture:** One additive local Prisma migration defines every previously missing durable entity. Four feature slices then work in non-overlapping files and consume existing session, CSRF, organization, room, class, submission, and task services. A final integration lane alone changes shared types, navigation, route guards, feature evidence, and cross-module user paths.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript, Nitro server routes, Prisma, Playwright, existing BDD feature files.

## Global Constraints

- Migration execution is local-development only. Never connect to, modify, or deploy to a production server/database.
- Only additive Prisma changes are allowed. Never use `prisma db push`, `prisma db reset`, destructive SQL, schema object renames, or broad cleanup commands.
- Do not stop/restart `3001`, start another Nuxt server, or run a queued test/build before the final one-time validation window.
- Every new behavior receives a BDD/API or Playwright contract before production code. The user-directed deferred test execution means all new coverage remains `IMPLEMENTED_UNVERIFIED` until final validation.
- Preserve existing uncommitted changes. Do not modify shared files outside the owning task.
- Business state comes from a server route/database, never `localStorage`; UI-only preferences remain allowed.

---

### Task 1: Local Durable Entity Foundation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_practicum_completion_entities/migration.sql`
- Create: `tests/e2e/practicum/practicum-completion-schema.spec.ts`

**Produces:** `TrainingRoomSetting`, `ClassAnnouncement`, `TeachingSession`, `ActivityExecution`, `JoinApplication`, `MemberInvite`, `AuditEvent`, `PracticumTemplate`, `Competition`, `CompetitionEntry`; all have scoped foreign keys, timestamps and non-destructive indices.

- [ ] Write schema contract tests that query each model through Prisma and assert required room/class scope.
- [ ] Add only the new models, relations, enums and indexes described in the parallel completion design.
- [ ] Generate a migration containing only `CREATE TABLE`, `CREATE INDEX` and `ALTER TABLE ... ADD CONSTRAINT` statements.
- [ ] Inspect the generated SQL manually for `DROP`, `TRUNCATE`, `DELETE`, `RENAME`, or schema-wide changes; reject the migration if any appear.
- [ ] Do not execute this migration or its test now; add both paths to the final validation queue.

### Task 2: Teacher Classroom and Review

**Files:**
- Create: `server/services/teacher-classroom.ts`
- Create: `server/api/practicum/teacher/classes/[classId]/announcements/index.get.ts`
- Create: `server/api/practicum/teacher/classes/[classId]/announcements/index.post.ts`
- Create: `server/api/practicum/teacher/classes/[classId]/sessions/index.get.ts`
- Create: `server/api/practicum/teacher/classes/[classId]/sessions/index.post.ts`
- Create: `server/api/practicum/teacher/sessions/[sessionId]/execution.get.ts`
- Create: `pages/practicum/teaching/[classId].vue`
- Create: `docs/bdd/teacher-classroom.feature.md`
- Create: `tests/e2e/practicum/teacher-classroom-closure.spec.ts`

**Consumes:** Task 1 models; existing `requireClassStaff`, CSRF middleware and `StudentTask`/submission facts.

**Produces:** Teacher-only class announcement/session DTOs and a classroom page with published announcements, a current session, activity execution counts and class-scoped review links.

- [ ] Define BDD scenarios for published visibility, class isolation, idempotent session start/end, invalid status transitions and teacher direct-link denial outside assigned classes.
- [ ] Define API/UI tests before production code for those behaviors.
- [ ] Implement server-side class/room authorization before reading or writing any model.
- [ ] Implement draft/published/closed announcements and active/ended sessions with transaction-safe idempotency keys.
- [ ] Render compact LearnEC-compatible classroom tabs; show server loading, empty, failure and permission states.
- [ ] Record the deferred test commands once, without executing them.

### Task 3: Member, Group, Invitation and Room Settings

**Files:**
- Create: `server/services/member-lifecycle.ts`
- Create: `server/api/practicum/members/invites/index.post.ts`
- Create: `server/api/practicum/members/applications/index.get.ts`
- Create: `server/api/practicum/members/applications/[applicationId]/decision.post.ts`
- Create: `server/api/practicum/room-settings/index.get.ts`
- Create: `server/api/practicum/room-settings/index.put.ts`
- Modify: `pages/practicum/members.vue`
- Modify: `pages/practicum/room-settings.vue`
- Create: `docs/bdd/member-room-lifecycle.feature.md`
- Create: `tests/e2e/practicum/member-room-lifecycle.spec.ts`

**Consumes:** Task 1 models and existing Prisma `Membership`/`VirtualGroup` entities.

**Produces:** Owner-authorized invite/application/state APIs and settings persisted to the local database.

- [ ] Define tests for invite expiration/revocation, duplicate application decisions, room isolation, role changes and refresh persistence.
- [ ] Define BDD scenarios before production code.
- [ ] Implement server-only lifecycle transitions: invite `ACTIVE -> USED|EXPIRED|REVOKED`; application `PENDING -> APPROVED|REJECTED|CANCELLED`.
- [ ] Replace only business writes in member/room pages with API calls; retain the existing visual composition and UI preference storage.
- [ ] Record deferred commands and expected assertions without executing them.

### Task 4: Resources, Notifications, Data Center and Audit

**Files:**
- Create: `server/services/resource-observability.ts`
- Create: `server/api/practicum/audit/index.get.ts`
- Create: `server/api/practicum/analytics/overview.get.ts`
- Create: `server/api/practicum/notifications/[notificationId]/read.post.ts`
- Modify: `pages/practicum/resources.vue`
- Modify: `pages/practicum/data-center.vue`
- Modify: `pages/practicum/notifications.vue`
- Create: `docs/bdd/resource-data-audit.feature.md`
- Create: `tests/e2e/practicum/resource-data-audit.spec.ts`

**Consumes:** Task 1 `AuditEvent`; existing server resources, notifications and analytics endpoints.

**Produces:** Server-scoped resource visibility, read notifications, data drill-down and audit list DTOs.

- [ ] Define BDD/API contracts for read-state persistence, resource visibility isolation, export authorization, audit filtering and empty/failure states.
- [ ] Implement room-scoped queries first, then page calls; never fall back to browser business data.
- [ ] Append audit events for resource, notification and data export writes using actor, room, entity and event type.
- [ ] Keep data-center tables and LearnEC spacing; add stable `data-*` selectors rather than visual-only controls.
- [ ] Record deferred tests exactly once.

### Task 5: Cases, Templates and Competition

**Files:**
- Create: `server/services/template-competition.ts`
- Create: `server/api/practicum/templates/index.get.ts`
- Create: `server/api/practicum/templates/[templateId]/toggle.post.ts`
- Create: `server/api/practicum/competitions/index.get.ts`
- Create: `server/api/practicum/competitions/index.post.ts`
- Create: `server/api/practicum/competitions/[competitionId]/entries.post.ts`
- Create: `pages/practicum/templates/index.vue`
- Create: `pages/practicum/competitions/index.vue`
- Create: `docs/bdd/templates-competitions.feature.md`
- Create: `tests/e2e/practicum/templates-competitions.spec.ts`

**Consumes:** Task 1 templates, competitions and entry models; existing role/session/CSRF middleware.

**Produces:** Owner template switches and student-authorized competition participation, with direct-link protection.

- [ ] Define BDD and tests for disabled template direct access, competition state transitions, one entry per student and room isolation.
- [ ] Implement server-side role checks and state machine validation before pages.
- [ ] Render real list/detail actions using existing workbench styles, including empty/unavailable/error states.
- [ ] Record all final test commands without executing them.

### Task 6: Shared Integration and Evidence

**Files:**
- Modify: `composables/usePracticumServer.ts`
- Modify: `domain/practicum/permissions.ts`
- Modify: `components/practicum/PracticumSidebar.vue`
- Modify: `components/practicum/PracticumTopbar.vue`
- Modify: `docs/feature-gap-matrix.md`
- Modify: `docs/acceptance-test-report.md`
- Modify: `docs/parity/2026-08-07-final-verification-queue.md`
- Create: `tests/e2e/practicum/three-role-integrated-closure.spec.ts`

**Consumes:** DTOs from Tasks 2-5.

**Produces:** One route/role map and integrated student-teacher-admin route contracts.

- [ ] Add DTO wrappers after every slice API is code-reviewed; do not create temporary client fallbacks.
- [ ] Align menu visibility and service-side permissions for teacher review/classroom, owner management, student competition and disabled templates.
- [ ] Add only real navigation routes; keep five top-level groups and preserve responsive LearnEC layout.
- [ ] Update status to `IMPLEMENTED_UNVERIFIED`, never `PASS`, until the one-time final validation output exists.
- [ ] Queue typecheck, build and focused Playwright tests using the documented once-only rules.
