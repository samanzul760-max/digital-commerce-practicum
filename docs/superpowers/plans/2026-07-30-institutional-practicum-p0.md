# Institutional Practicum P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a relational, class-scoped teaching foundation without breaking current plan and student learning routes.

**Architecture:** Prisma/PostgreSQL becomes the authoritative persistence layer. Server services perform organization, room, class, and role checks before reads or writes. Existing JSON data remains a development-only source for a one-time seed while new task and submission routes use database IDs.

**Tech Stack:** Nuxt 3, TypeScript, Prisma, PostgreSQL, Playwright.

## Global Constraints

- Preserve current `OWNER` flows while introducing staff scopes.
- Never authorize from localStorage; only session user plus server-side enrollment scopes grant access.
- Return `404` for inaccessible IDs and stable `403` or `409` codes for invalid state.
- Every behavioral change starts with a Playwright API test that is observed failing.
- Do not store files inside the database; this slice stores only attachment metadata placeholders.

---

### Task 1: Add Prisma Runtime and Relational Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `server/db/client.ts`
- Modify: `package.json`
- Test: `tests/e2e/practicum/p0-schema.spec.ts`

**Produces:** `PrismaClient` and models for organization, room, cohort, class, enrollment, plan assignment, student task, submission, grade, and audit event.

- [ ] **Step 1: Write a failing schema smoke test** asserting the generated client can create an organization, cohort, class, teacher enrollment, and student enrollment.
- [ ] **Step 2: Run `npx playwright test tests/e2e/practicum/p0-schema.spec.ts --reporter=list`** and verify RED because Prisma is absent.
- [ ] **Step 3: Add `prisma`, `@prisma/client`, a PostgreSQL datasource, and models with unique keys:** `ClassEnrollment(classId,userId)`, `TeacherClassScope(classId,userId)`, `PlanAssignment(planId,classId)`, and `StudentTask(planAssignmentId,studentId,activityId)`.
- [ ] **Step 4: Run `npx prisma generate` and the schema smoke test**; verify GREEN.
- [ ] **Step 5: Commit** `feat(data): add institutional practicum schema`.

### Task 2: Add Scoped Authorization Service

**Files:**
- Create: `server/services/authorization.ts`
- Modify: `server/utils/auth-session.ts`
- Test: `tests/e2e/practicum/p0-authorization.spec.ts`

**Consumes:** Prisma `ClassEnrollment` and current authenticated user.

**Produces:** `requireClassScope(event, classId, actions)` and `requireStudentTaskScope(event, taskId)`.

- [ ] **Step 1: Write failing tests** for authorized teacher access, cross-class teacher `404`, and student access to only their own task.
- [ ] **Step 2: Run the focused test** and verify RED because the scopes do not exist.
- [ ] **Step 3: Implement database-backed scope lookup**, resolving organization and room before class and task IDs; do not accept role values from request bodies.
- [ ] **Step 4: Re-run focused tests** and verify all cases GREEN.
- [ ] **Step 5: Commit** `feat(auth): enforce class-scoped server authorization`.

### Task 3: Implement Cohort, Class, and Enrollment APIs

**Files:**
- Create: `server/api/practicum/cohorts/index.post.ts`
- Create: `server/api/practicum/classes/index.post.ts`
- Create: `server/api/practicum/classes/[classId]/enrollments/index.post.ts`
- Create: `server/api/practicum/teacher/classes.get.ts`
- Test: `tests/e2e/practicum/classes-api.spec.ts`

**Consumes:** Task 1 schema and Task 2 authorization.

**Produces:** Owner-managed cohorts/classes and teacher-visible scoped class list.

- [ ] **Step 1: Write failing API tests** for creation, duplicate enrollment rejection, and teacher list isolation.
- [ ] **Step 2: Run the focused test** and verify RED with missing routes.
- [ ] **Step 3: Implement validated routes** using transactions; require `OWNER` for administration and require teacher enrollment for the list.
- [ ] **Step 4: Re-run focused tests** and verify GREEN.
- [ ] **Step 5: Commit** `feat(classes): add cohort enrollment and teacher scope APIs`.

### Task 4: Deliver Plans to Classes and Materialize Student Tasks

**Files:**
- Create: `server/services/plan-assignment.ts`
- Create: `server/api/practicum/plan-assignments/index.post.ts`
- Create: `server/api/practicum/student/tasks.get.ts`
- Modify: `domain/practicum/types.ts`
- Test: `tests/e2e/practicum/plan-assignment-api.spec.ts`

**Consumes:** classes, current plan/node records, and authorization service.

**Produces:** class delivery with availability/deadline and one task per student/activity.

- [ ] **Step 1: Write failing tests** proving two students receive different task IDs for the same activity and an unauthorized teacher cannot assign another class.
- [ ] **Step 2: Run the focused test** and verify RED.
- [ ] **Step 3: Implement transactional task materialization** with `availableAt`, `dueAt`, `latePolicy`, and immutable assignment snapshot fields.
- [ ] **Step 4: Re-run focused tests** and verify GREEN.
- [ ] **Step 5: Commit** `feat(plans): assign plans to classes with student tasks`.

### Task 5: Add Dependency and Availability State Rules

**Files:**
- Create: `server/services/task-availability.ts`
- Create: `server/api/practicum/student-tasks/[taskId].get.ts`
- Modify: `server/services/plan-assignment.ts`
- Test: `tests/e2e/practicum/task-availability-api.spec.ts`

**Produces:** availability decisions for dates, prerequisite completion, and closed tasks.

- [ ] **Step 1: Write failing tests** for unavailable date, unmet prerequisite, and satisfied prerequisite.
- [ ] **Step 2: Run the focused test** and verify RED.
- [ ] **Step 3: Implement `getTaskAvailability`**, returning machine-readable state codes and never relying on browser `lockedActivityIds`.
- [ ] **Step 4: Re-run focused tests** and verify GREEN.
- [ ] **Step 5: Commit** `feat(tasks): enforce server task availability rules`.

### Task 6: Migrate Submission Identity to Student Tasks

**Files:**
- Create: `server/services/submissions.ts`
- Create: `server/api/practicum/student-tasks/[taskId]/submissions/index.post.ts`
- Create: `server/api/practicum/teacher/submissions/index.get.ts`
- Modify: `server/api/practicum/submissions/**`
- Test: `tests/e2e/practicum/task-submissions-api.spec.ts`

**Consumes:** `StudentTask` availability and class authorization.

**Produces:** immutable versions per student task and class-scoped teacher review queue.

- [ ] **Step 1: Write failing tests** for parallel student submissions, teacher review only within scope, and returned-work resubmission producing version 2.
- [ ] **Step 2: Run the focused test** and verify RED.
- [ ] **Step 3: Implement submission and review transactions**, including rubric score validation, audit entries, and idempotency keys.
- [ ] **Step 4: Re-run focused tests** and verify GREEN.
- [ ] **Step 5: Commit** `feat(submissions): scope assessment to student tasks`.

### Task 7: Migrate Development Seeds and Preserve Existing Routes

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`
- Modify: `server/utils/practicum-repository.ts`
- Test: `tests/e2e/practicum/p0-compatibility.spec.ts`

**Produces:** repeatable development data and compatibility adapters for existing owner/student routes.

- [ ] **Step 1: Write failing tests** covering current owner plan list and student learning route against seeded relational data.
- [ ] **Step 2: Run the focused test** and verify RED after relational route introduction.
- [ ] **Step 3: Seed current organizations, rooms, plans, nodes, activities, sample class, staff scope, and students; adapt existing reads to Prisma.**
- [ ] **Step 4: Re-run focused tests and current plan/submission suites**; verify GREEN.
- [ ] **Step 5: Commit** `refactor(data): seed and bridge relational practicum data`.

### Task 8: Full Verification and Documentation

**Files:**
- Modify: `docs/data-model.md`
- Modify: `docs/permission-matrix.md`
- Modify: `docs/api-contract.md`
- Modify: `docs/acceptance-test-report.md`

- [ ] **Step 1: Update model, API, and permission documentation** with final routes, scope rules, and known deferred UI work.
- [ ] **Step 2: Run `npm.cmd run typecheck`.**
- [ ] **Step 3: Run `npx.cmd playwright test tests/e2e/practicum --reporter=list`.**
- [ ] **Step 4: Run `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`.**
- [ ] **Step 5: Run `git diff --check`, inspect `git status --short`, and commit only P0 files** with `feat(practicum): establish class-scoped learning foundation`.
