# LearnEC Phase B Work Orders Implementation Plan

> **For agentic workers:** Execute this plan inline task-by-task with red-green TDD. Do not implement Phase C submissions/sandbox sessions, Phase D grading/analytics, or Phase E competition engines.

**Goal:** Build Prisma-backed work-order authoring, resource/template composition, validated weighting, and idempotent class publication that creates one StudentTask per active student.

**Architecture:** Extend `PlanAssignment` as the aggregate root and persist ordered child content in `TaskSection` plus typed media/question/sandbox tables. A focused `work-order` service owns validation, serialization, authorization scope, template copying, and publish transactions; Nitro handlers remain thin. Vue pages consume only the new ADMIN APIs inside the existing LearnEC shell.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript, Nitro/H3, Prisma 6, PostgreSQL, Playwright.

## Global Constraints

- Roles remain `ADMIN` and `STUDENT`; every new ADMIN handler enforces server-side authorization.
- Prisma/PostgreSQL is the fact source; no localStorage, JSON business store, or mock success state.
- Preserve existing global CSS, shell layout, navigation and legacy pages.
- A published work order is immutable and freezes weights, answer keys and section schema in `publishedSnapshot`.
- Only Phase B routes and services may become functional.

---

### Task 1: Add the Phase B persistence contract

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260810130000_learnec_phase_b_work_orders/migration.sql`
- Modify: `prisma/seed.mjs`
- Modify: `scripts/seed-isolated-e2e-fixtures.mjs`
- Test: `tests/e2e/practicum/phase-b-work-orders.spec.ts`

**Interfaces:**
- Produces Prisma models `ResourceCatalogItem`, `WorkOrderTemplate`, `TaskSection`, `MediaResource`, `TaskQuestion`, `SandboxSpec`, `SandboxStep`, `SandboxRubricItem` and the new `PlanAssignment` fields.
- Produces enums `ResourceSource`, `SandboxType`, `TaskSectionType`, `MediaKind`, `QuestionType`, `TrainingRoomType`.

- [ ] Write the E2E contract first so resource and task endpoints fail with 404 before routes exist.
- [ ] Add schema and SQL migration with cascading task-section children and unique ordering constraints.
- [ ] Seed deterministic resources for all three sources and one `70:30` template in both normal and isolated seeds.
- [ ] Run `npx.cmd prisma generate` and `npx.cmd prisma validate`; expected exit code is 0.

### Task 2: Implement work-order validation and draft persistence

**Files:**
- Create: `server/services/work-orders.ts`
- Create: `server/api/admin/classes/index.get.ts`
- Create: `server/api/admin/resources/index.get.ts`
- Create: `server/api/admin/tasks/index.get.ts`
- Create: `server/api/admin/tasks/index.post.ts`
- Create: `server/api/admin/tasks/[taskId]/index.get.ts`
- Create: `server/api/admin/tasks/[taskId]/index.patch.ts`
- Test: `tests/e2e/practicum/phase-b-work-orders.spec.ts`

**Interfaces:**
- Consumes `requireAdmin(event)` and `requireClassStaff(user, classId)`.
- Produces `listAdminClasses`, `listResourceCatalog`, `listWorkOrders`, `createWorkOrder`, `getWorkOrder`, `updateWorkOrderDraft`.
- Draft payload contains `classId`, `title`, `description`, `autoScoreWeight`, `manualScoreWeight`, `timeLimitMinutes`, `availableAt`, `dueAt`, `lateAllowed`, and ordered typed `sections`.

- [ ] Add failing tests for STUDENT 403, empty title 422, cross-room class 404, and a valid nested draft round trip.
- [ ] Implement strict text/number/date/enum parsing and score-section weight validation.
- [ ] Replace draft sections in one transaction, creating parents before children through client keys.
- [ ] Return Decimal values as numbers and dates as ISO strings from a single serializer.

### Task 3: Add safe preview, templates and idempotent publication

**Files:**
- Modify: `server/services/work-orders.ts`
- Create: `server/api/admin/tasks/[taskId]/preview.get.ts`
- Create: `server/api/admin/tasks/[taskId]/publish.post.ts`
- Create: `server/api/admin/tasks/[taskId]/publications.get.ts`
- Create: `server/api/admin/task-templates/index.get.ts`
- Create: `server/api/admin/task-templates/index.post.ts`
- Create: `server/api/admin/task-templates/[templateId]/copy.post.ts`
- Test: `tests/e2e/practicum/phase-b-work-orders.spec.ts`

**Interfaces:**
- Produces `previewWorkOrder`, `createWorkOrderTemplate`, `copyWorkOrderTemplate`, `publishWorkOrder`, `getPublicationSummary`.
- `publishWorkOrder(actor, taskId, path, idempotencyKey, schedule)` returns `{ assignment, taskCount, replayed }`.

- [ ] Add failing tests proving preview omits `answerKey`, invalid 60:30 weights reject publication, and one active student produces one StudentTask.
- [ ] Add a repeated publish test using the same idempotency key and assert task count remains one.
- [ ] Freeze the complete teacher snapshot, expose a sanitized preview, and create StudentTask rows with `activityId = assignment.id` in one transaction.
- [ ] Copy templates into independent DRAFT rows and independent child records.

### Task 4: Build the work-order management pages

**Files:**
- Create: `components/learnec/WorkOrderList.vue`
- Create: `components/learnec/WorkOrderEditor.vue`
- Create: `components/learnec/WorkOrderPreview.vue`
- Create: `components/learnec/WorkOrderTemplates.vue`
- Create: `pages/admin/tasks/index.vue`
- Create: `pages/admin/tasks/new.vue`
- Create: `pages/admin/tasks/[taskId]/edit.vue`
- Create: `pages/admin/tasks/[taskId]/preview.vue`
- Create: `pages/admin/tasks/[taskId]/publications.vue`
- Create: `pages/admin/tasks/templates.vue`
- Create: `pages/admin/assignments.vue`
- Modify: `components/learnec/AppShell.vue`
- Test: `tests/e2e/practicum/phase-b-work-orders.spec.ts`

**Interfaces:**
- Pages call only `/api/admin/**` through `$fetch` and `useCsrfHeaders()`.
- Editor emits persisted server responses; it never treats browser state as the saved work order.

- [ ] Add a failing browser journey that creates a draft, adds resource and quiz sections, saves, previews, publishes, refreshes, and sees the publication count.
- [ ] Implement loading, empty, validation-error and success states using scoped styles that inherit the current shell.
- [ ] Add stable `data-*` selectors for list, editor, resources, weights, preview, template copy and publish results.
- [ ] Keep task navigation active for all `/admin/tasks/**` and `/admin/assignments` routes without changing its appearance.

### Task 5: Add classified training-center entry for the approved Phase B route

**Files:**
- Create: `server/api/admin/training-centers/index.get.ts`
- Create: `pages/admin/training-centers.vue`
- Test: `tests/e2e/practicum/phase-b-work-orders.spec.ts`

**Interfaces:**
- Produces read-only cards for `TEACHING`, `COMPETITION`, `CERTIFICATION` from real `TrainingRoom` rows.
- Competition/certification engines remain `COMING_SOON`; no fake entries, teams or scores are written.

- [ ] Add a failing test for ADMIN access and STUDENT 403.
- [ ] Return scoped room records and honest capability status.
- [ ] Render the three approved category entries in the existing shell.

### Task 6: Run the Phase B gate and commit

**Files:**
- Modify: `docs/acceptance-test-report.md`

- [ ] Run `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-b-work-orders.spec.ts`; expected all Phase B cases pass.
- [ ] Run `npm.cmd run typecheck`; expected exit code 0.
- [ ] Run `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`; expected exit code 0.
- [ ] Start `.output/server/index.mjs` on 4310 and verify `/admin/tasks` redirects unauthenticated users to `/login` while `/login` returns 200.
- [ ] Record commands, counts, residual risks and Phase B scope in `docs/acceptance-test-report.md`.
- [ ] Stage only Phase B files, run `git diff --cached --check`, and commit `phase-B: work-order authoring and publication`.
