# LearnEC Phase D Review and Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the administrator review, weighted grading, evidence traceability, learning analytics, and `.xlsx` class grade export closure.

**Architecture:** Server-side review services authorize every StudentTask through its class, read only the current immutable SubmissionVersion, and persist current plus revision grade snapshots transactionally. Nuxt admin pages use those APIs for a responsive three-panel review workspace and a data dashboard.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, Nitro/H3, Prisma/PostgreSQL, Playwright, ExcelJS.

## Global Constraints

- Only `ADMIN` and `STUDENT` application roles are allowed.
- All task, evidence, grade, revision, return, analytics, and export data is persisted with Prisma.
- Do not implement phase E modules.
- Run the focused E2E test, `npm run typecheck`, and `npm run build` before acceptance.

### Task 1: Define the observable review contract

**Files:**
- Create: `docs/bdd/review-grading.feature.md`
- Create: `tests/e2e/practicum/phase-d-review-data.spec.ts`

- [ ] Write tests for an ADMIN reviewing a submitted sandbox work order, calculating 70/30 score, persisting a revision, returning a task with feedback, and downloading `.xlsx`.
- [ ] Run `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-d-review-data.spec.ts` and confirm the absent review API makes the test fail.

### Task 2: Persist weighted grade snapshots

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260810190000_learnec_phase_d_review_data/migration.sql`
- Create: `server/services/review-center.ts`

- [ ] Add automatic score, manual score and applied weights to `Grade` and `GradeRevision`.
- [ ] Implement scoped queue/detail reads, current-version automatic scoring, validation, transactionally appended `GradeRevision`, and return events.
- [ ] Re-run the focused test and confirm its API assertions move past the previous 404 failure.

### Task 3: Add administrator review and data APIs

**Files:**
- Create: `server/api/admin/reviews/index.get.ts`
- Create: `server/api/admin/reviews/[studentTaskId]/index.get.ts`
- Create: `server/api/admin/reviews/[studentTaskId]/grade.post.ts`
- Create: `server/api/admin/reviews/[studentTaskId]/return.post.ts`
- Create: `server/api/admin/data/index.get.ts`
- Create: `server/api/admin/data/export.get.ts`
- Modify: `package.json`

- [ ] Require ADMIN and class scope on all reads and writes.
- [ ] Generate a server-side `.xlsx` grade sheet and append an export `AuditEvent`.
- [ ] Run the focused test until queue, detail, score, return, data and download assertions pass.

### Task 4: Build review and analytics screens

**Files:**
- Create: `components/admin/ReviewQueue.vue`
- Create: `components/admin/ReviewEvidence.vue`
- Create: `components/admin/ReviewGradingPanel.vue`
- Create: `pages/admin/reviews.vue`
- Create: `pages/admin/data.vue`

- [ ] Build the desktop three-panel review layout, preserving its reading order on narrow screens.
- [ ] Bind grading and return forms to persisted APIs, expose evidence/history, and trigger `.xlsx` download from the data dashboard.
- [ ] Extend Playwright assertions for the two pages and 390px overflow.

### Task 5: Verification and handoff

**Files:**
- Modify: `docs/acceptance-test-report.md` only for the phase D hunk

- [ ] Run `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-d-review-data.spec.ts`.
- [ ] Run `npm.cmd run typecheck`.
- [ ] Run `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`.
- [ ] Start the verified application on port 4310 and record the exact command and result.
