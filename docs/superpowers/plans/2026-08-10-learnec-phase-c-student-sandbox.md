# LearnEC Phase C Student Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Prisma-backed student assignment center, left-guide/right-workbench experience, five scoped sandbox sub-apps, completion validation, and immutable submission flow.

**Architecture:** Read the immutable `PlanAssignment.publishedSnapshot`, persist one `SandboxSession` per `StudentTask`, and store section-scoped state plus snapshots under the owned task id. A focused student-task service owns authorization, time/state transitions, sanitization, completion checks, and the submission transaction; Nitro handlers stay thin and Vue pages call only `/api/center/**`.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript, Nitro/H3, Prisma 6, PostgreSQL, Playwright.

## Global Constraints

- Implement Phase C only; do not implement ADMIN review, grading, analytics export, or competition engines.
- Every business fact is stored in PostgreSQL through Prisma; no localStorage or frontend mock completion.
- New APIs require the `STUDENT` role and scope every task, session, snapshot, and submission by current user plus `studentTaskId`.
- Preserve the approved LearnEC shell and global styling; new styles remain scoped to Phase C components.
- Published question answer keys never appear in student API responses or page HTML.

---

### Task 1: Define the Phase C persistence and failing browser contract

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260810170000_learnec_phase_c_student_sandbox/migration.sql`
- Modify: `prisma/seed.mjs`
- Modify: `scripts/seed-isolated-e2e-fixtures.mjs`
- Create: `tests/e2e/practicum/phase-c-student-sandbox.spec.ts`

**Interfaces:**
- Produces `SubmissionPartStatus`, `SandboxSession`, `SandboxSnapshot`, `SubmissionPart`, and `SubmissionVersion.artifact/operationSummary`.
- Seeds one deterministic published five-sandbox assignment and one `StudentTask` for `student1`.

- [ ] Write E2E requests for `/api/center/assignments`, task start/draft/submit, five sandbox types, ownership rejection, incomplete rejection, and replayed submission.
- [ ] Run `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-c-student-sandbox.spec.ts`; expect route 404 failures before implementation.
- [ ] Add the schema and SQL migration with cascading relations and indexes on `studentTaskId` and snapshot time.
- [ ] Add deterministic normal and isolated Seed rows whose published snapshot contains five SANDBOX sections and no answer keys in student responses.
- [ ] Run `npx.cmd prisma format`, `npx.cmd prisma validate`, and `npx.cmd prisma generate`; expect exit code 0.

### Task 2: Implement the scoped student-task service and APIs

**Files:**
- Create: `server/services/student-work-orders.ts`
- Create: `server/api/center/assignments/index.get.ts`
- Create: `server/api/center/student-tasks/[taskId]/index.get.ts`
- Create: `server/api/center/student-tasks/[taskId]/start.post.ts`
- Create: `server/api/center/student-tasks/[taskId]/draft.post.ts`
- Create: `server/api/center/student-tasks/[taskId]/events.post.ts`
- Create: `server/api/center/student-tasks/[taskId]/submissions/index.post.ts`
- Test: `tests/e2e/practicum/phase-c-student-sandbox.spec.ts`

**Interfaces:**
- Produces `listStudentAssignments`, `getStudentWorkOrder`, `startStudentWorkOrder`, `saveStudentDraft`, `recordStudentTaskEvent`, and `submitStudentWorkOrder`.
- `saveStudentDraft(actor, taskId, input)` returns the persisted session state and a new scoped snapshot id.
- `submitStudentWorkOrder(actor, taskId, path, key)` returns `{ task, submission, replayed }` or `422 TASK_INCOMPLETE` with `missingItems`.

- [ ] Implement an owned-task query using `id + studentId`; use 404 for missing and 403 for non-STUDENT callers.
- [ ] Parse only published snapshot sections and recursively remove `answerKey`, explanations, and teacher-only configuration from student output.
- [ ] Implement availability and effective deadline checks using server time and `timeLimitMinutes`.
- [ ] Sanitize QUIZ, MEDIA, and SANDBOX draft payloads against ids and allowlists; persist session, snapshot, and `DRAFT_SAVED` in one transaction.
- [ ] Validate all required frozen sections and return exact missing ids/labels before any submission write.
- [ ] Implement the idempotent Submission/Version/Part/final-snapshot/TaskEvent/status transaction.
- [ ] Re-run the API-focused E2E cases; expect all ownership, persistence, completion, and replay assertions to pass.

### Task 3: Build the assignment center and left-guide/right-workbench UI

**Files:**
- Create: `components/center/AssignmentCard.vue`
- Create: `components/center/TaskGuidePanel.vue`
- Create: `components/center/SandboxWorkbench.vue`
- Create: `components/center/StoreBasicsSandbox.vue`
- Create: `components/center/ProductManagementSandbox.vue`
- Create: `components/center/StoreDecorationSandbox.vue`
- Create: `components/center/MarketingSandbox.vue`
- Create: `components/center/BusinessAnalyticsSandbox.vue`
- Create: `pages/center/assignments/index.vue`
- Create: `pages/center/assignments/[studentTaskId].vue`
- Create: `pages/center/tasks/[studentTaskId]/sandbox.vue`
- Modify: `pages/center.vue`
- Modify: `components/learnec/AppShell.vue`
- Test: `tests/e2e/practicum/phase-c-student-sandbox.spec.ts`

**Interfaces:**
- Pages consume only `/api/center/**`; no browser persistence.
- `SandboxWorkbench` emits `save-section` with `{ sectionId, values, completedStepIds, answers, mediaProgress }`.
- `TaskGuidePanel` consumes server-derived deadline, steps, rubric items, and missing item ids.

- [ ] Add the failing browser journey for filtering assignments, opening the sandbox, switching five types, saving evidence, seeing incomplete locations, submitting, refreshing, and 390px overflow.
- [ ] Build the status-filtered list with loading, empty, error, and server status badges.
- [ ] Build the stable two-column layout and mobile vertical layout without changing the global shell appearance.
- [ ] Build five domain-specific controlled sub-apps; decoration supports component add/reorder/style state, analytics reads server-persisted simulation data.
- [ ] Wire save and submit actions to CSRF-protected endpoints and render server validation errors beside matching guide steps.
- [ ] Re-run the complete Phase C E2E file; expect every API and browser case to pass.

### Task 4: Run the Phase C acceptance gate

**Files:**
- Modify: `docs/acceptance-test-report.md`

**Interfaces:**
- Produces fresh local verification evidence for Phase C without committing until user acceptance.

- [ ] Run `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-c-student-sandbox.spec.ts`; expect all Phase C cases passed.
- [ ] Run `npm.cmd run typecheck`; expect exit code 0.
- [ ] Stop only Node processes listening on 4310 if needed, set `NUXT_IGNORE_LOCK=1`, and run `npm.cmd run build`; expect exit code 0.
- [ ] Apply the Phase C migration and Seed to the default local database.
- [ ] Start `.output/server/index.mjs` on `127.0.0.1:4310`; verify student login, `/center/assignments`, and one sandbox route.
- [ ] Append commands, results, scope, and residual risks to `docs/acceptance-test-report.md`; stage and commit only after the user explicitly accepts Phase C.
