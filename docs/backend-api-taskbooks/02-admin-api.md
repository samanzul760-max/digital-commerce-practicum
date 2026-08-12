# LearnEC Administrator and Teacher API Taskbook

## Purpose and Boundary

This taskbook is for the administrator/teacher workbench backend. The user-facing frontend may call the APIs from a separate application, but all teaching decisions, visibility, classroom scope, scores and exports are made on the server.

`ADMIN` is the single new-platform authority. It includes the operational abilities historically called owner, teacher, mentor or assistant, while class enrollment and room scope still determine which class an administrator may operate.

## Administrator Capability Map

| Capability | Detailed platform behavior | Required backend result |
|---|---|---|
| Account administration | Create student accounts individually or by validated import; search, filter, enable/disable, reset temporary passwords and inspect account state. | Password hashes only; reset revokes sessions; import reports row-level errors without partial silent writes. |
| Organization and room administration | Create/edit/archive training rooms, configure teaching/competition/certification type, audience, cover, introduction, teaching mode and room settings. | Every write is room-scoped and audited; archived rooms become read-only. |
| Cohorts, classes and groups | Create cohorts/classes, enroll students, create virtual groups, move students, inspect membership history and class capacity. | Unique active enrollment; group moves retain audit trail; non-members never receive class tasks. |
| Invitation and application | Create expiring invitation links, revoke them, accept self-service join applications, approve or reject singly/bulk. | Token hashes only; expiry, room scope, duplicate enrollment and idempotency are enforced. |
| Resource catalog | Curate software, course, training camp, enterprise task and reference resources; tag, search, control visibility and inspect use count. | Catalog resource deletion is blocked or soft-deleted when referenced by templates. |
| Media and attachments | Upload/replace controlled media, inspect metadata and usage, remove unused files. | MIME/extension/size policy, storage key instead of local path, virus scanning hook and permissioned download URL. |
| Work-order authoring | Build a reusable work order with media, learning sections, questions, sandbox steps, required evidence, dependencies, time limits and rubrics. | Draft versioning and validation; section weights and automatic/manual weights must total 100. |
| Template library | Search templates, create from scratch, copy safely, archive, compare version and reuse approved catalog resources. | Copy creates a new draft with no accidental cross-room ownership. |
| Assignment publication | Select class/groups, dates, due date, time limit and score policy; preview student view; publish/close/withdraw and inspect delivery results. | Atomic student task creation, immutable publication snapshot and idempotent publish record. |
| Classroom delivery | Create classroom assignments and announcements, start teaching sessions, inspect live participation and execution records. | Classroom writes reuse `PlanAssignment`/`StudentTask`; announcements are persisted notifications, not page messages. |
| Review center | Filter by class/task/student/status, open evidence timeline, compare versions, score, revise score, return for correction and move to next learner. | Read only current authorized class; grade revision and return event are immutable/audited. |
| Learning analytics | View class completion, late work, submission/review distribution, per-task outcomes, group comparison, ranking and student drill-down. | Aggregates come from Prisma records; definitions document denominators and exclude ungraded scores where appropriate. |
| Export and audit | Export gradebook, class performance and review evidence summaries; query privileged action history. | Server-generated XLSX/CSV, stable columns, audit event per export and permission check before stream. |
| Competition and examination | Configure question banks, contest templates, enrollment scope, time window, attempt rules, grading policy, result release and closure. | Reuse common submission/grade stores; result release is explicit and audited. |

## Canonical Administrator APIs

| Area | API contract |
|---|---|
| Session/profile | `GET/PATCH /api/auth/profile`, `POST /api/auth/logout` |
| Accounts | `GET/POST /api/admin/accounts`, `PATCH /api/admin/accounts/:id/status`, `POST /api/admin/accounts/:id/reset-password` |
| Classes/members | `GET/POST/PATCH /api/admin/classes`, `/classes/:id/enrollments`, `/classes/:id/groups`, `/classes/:id/invites`, `/classes/:id/applications` |
| Resources/media | `GET/POST/PATCH /api/admin/resources`, `POST /api/admin/media`, `DELETE /api/admin/media/:id` |
| Templates/tasks | `GET/POST /api/admin/task-templates`, `POST /api/admin/task-templates/:id/copy`, `GET/POST/PATCH /api/admin/tasks/:id`, `GET /preview`, `POST /publish`, `POST /close` |
| Classroom | `GET/POST /api/admin/classes/:id/announcements`, `/sessions`, `/sessions/:id/execution` |
| Review | `GET /api/admin/reviews`, `GET /api/admin/reviews/:studentTaskId`, `POST /grade`, `POST /return` |
| Data/export | `GET /api/admin/data?classId=`, `GET /api/admin/data/export?classId=`, `GET /api/admin/audit` |
| Competition | `GET/POST/PATCH /api/admin/competitions`, `/question-banks`, `/entries`, `/results/release`, `/close` |

List endpoints use `page`, `pageSize`, `keyword`, `sort`, `order` and documented filters. Writes validate a request body, CSRF token, scope and idempotency/version field before mutation.

## Key Administrator Flows

### From content to student task

1. The administrator selects catalog resources and creates a draft template.
2. The server validates sections, dependencies, evidence requirements and score weights.
3. The administrator previews the student-safe projection. Answers, private rubric notes and staff identifiers are omitted.
4. Publishing targets a class or authorized virtual groups. The transaction stores the frozen assignment snapshot and creates tasks for eligible active enrollments.
5. A publish notification is generated only after the assignment transaction succeeds.

### From evidence to grade

1. The review queue returns only submitted/returned/graded tasks in the administrator's authorized room and classes.
2. Review detail exposes submission versions, submission parts, sandbox snapshots and task events.
3. Grade uses the selected current version and `expectedVersion`; stale tabs return `409 REVIEW_VERSION_CONFLICT`.
4. Return requires feedback and makes the student task editable again without altering old evidence.
5. Grade revision updates the live grade and appends a `GradeRevision`, `TaskEvent` and `AuditEvent` transactionally.

## Public Research Addendum: Mature Teaching Operations

Public university laboratory pages and procurement documents show that a mature administrator system has three coordinated layers: course resources, classroom delivery, and evidence-based assessment. LearnEC should add them in this order, without building independent demo subsystems.

| Capability to deliver | Concrete administrator behavior | Required contract and guardrail |
|---|---|---|
| Course and task-book governance | Store syllabus, learning objective, prerequisite knowledge, step guide, practice, question set, rubric and associated sandbox package; copy a task book into a new draft. | Version content; publication freezes a student-safe projection; source answers and staff notes never enter the projection. |
| Classroom orchestration | Create an authorized class session, select published assignments, announce a schedule/material, issue an in-class task or assessment, and inspect start/progress/submission signals. | Reuse `PlanAssignment`, `StudentTask`, `TeachingSession`, `ClassAnnouncement` and `ActivityExecution`; do not invent a second assignment or attendance record. |
| Process assessment | Inspect each learner's task events, drafts, attempts, sandbox snapshots, time used, required evidence and historical submission versions. | The detail endpoint is class-scoped, paginated where needed, and contains immutable timestamps. It cannot read another room's learner. |
| Dual-track scoring | Configure objective rules for machine-checkable work and a rubric for teacher judgement; review individual score items and return a task with actionable feedback. | Score weights freeze at publication; manual score range/rounding is server-validated; revisions are append-only and notify the learner only after release. |
| Analytics, intervention and export | Compare completion, late submission, attempt/error patterns, score distribution and section/skill outcomes; drill down to the underlying task/version; export a gradebook. | Each metric declares its denominator and time range; exports are generated server-side, authorization-checked and audited. Ranking is room-setting controlled rather than globally exposed. |
| Specialty packages and contest/certification delivery | Attach a governed package for cross-border operation, data operation, customer service or live-commerce; later create a competition/exam from the same task templates. | A package contributes schemas/rubrics/resources only. Its learner evidence, submissions, grades, eligibility and result release always reuse the shared core. |

### Research Traceability

- [Xichang University](https://www.xcc.edu.cn/dzsw/697047/697053/707950/index.html) and [Shanghai Business School's 2020 procurement](http://xxgk.sicp.edu.cn/2020_10/29_14/content-23035.html) publicly require class/student/task/question/resource management and learner training records.
- [Chongqing public procurement requirements](https://www.cqip.com.cn/upfiles/202503/20250305173834987.pdf) publicly require one-click classroom setup, assignments/exams/announcements, learning/task trends, operation record review, automatic and teacher scoring, score release and teaching data dashboards.
- [Shanghai Business School's 2024 live-commerce procurement](https://www.sicp.edu.cn/html/162/2024-06-25/content-7850.shtml) publicly calls for job-task modules, task-state labels, grading standards, automatic/manual scoring and class/experiment/grade/question/resource management.
- [Shenzhen University](https://eme.szu.edu.cn/info/1126/1673.htm) publicly describes one teaching-management entry for multiple independent specialized training systems, which supports LearnEC's package model rather than separate backends.

## Administrator Task Sequence

### Task A1: Accounts, membership and class scope

- [ ] Write failing API tests for cross-room account access, duplicate enrollment, expired invite, revoked invite and session revocation after disabling an account.
- [ ] Implement Prisma-backed account, enrollment, group, invite and application endpoints.
- [ ] Run role, scope, pagination and duplicate-request regressions before committing the slice.

### Task A2: Resource and media governance

- [ ] Write failing tests for unauthorized upload, invalid MIME/size, resource visibility and removal of a referenced resource.
- [ ] Implement catalog/media metadata endpoints and controlled storage adapter.
- [ ] Add audit events for create, replace and remove actions.

### Task A3: Template, task and publication closure

- [ ] Write failing tests for invalid score weights, dependency cycles, stale template version, duplicate publish and student-safe preview.
- [ ] Implement or migrate canonical template/task/publish APIs into Prisma services.
- [ ] Verify frozen student snapshot and class/group delivery against an isolated database.

### Task A4: Classroom, review and data closure

- [ ] Write failing tests for unauthorized class session/announcement operations, stale grading and return without feedback.
- [ ] Implement classroom services, review queue/detail, grade revisions, analytics and XLSX export.
- [ ] Verify that every privileged write creates audit evidence and that analytics match persisted submissions/grades.

### Task A5: Competition administration

- [ ] Write failing tests for enrollment scope, opening/closing window, duplicate registration, result-release permission and student result isolation.
- [ ] Implement Prisma-backed competition, question-bank and entry services using the shared submission/grade model.
- [ ] Deprecate equivalent legacy endpoints only after API and browser journeys pass.

## Administrator Parity Gate

The administrator workbench matches the public capability baseline only when each item is reachable from the administrator information architecture and is backed by the server contracts in this taskbook:

- [ ] Manage student accounts, classes, memberships, groups, invitations and applications with room/class isolation.
- [ ] Manage reusable teaching resources and task books, including guide sections, question banks, rubrics and specialist sandbox packages.
- [ ] Create teaching sessions, publish announcements and deliver assignments/exams through the same `PlanAssignment`/`StudentTask` chain.
- [ ] Inspect a student's actual learning record: starts, events, attempts, drafts, sandbox snapshots, submission versions and time-related evidence.
- [ ] Apply automatic and manual scoring, return with feedback, revise grades with an audit trail and release only the permitted learner result.
- [ ] View reconciled class/task/section data, drill down to evidence and export an audited gradebook.
- [ ] Configure competition/certification only by reusing the shared task, evidence, grading and result-release lifecycle.

For every checkbox, acceptance must include: a discoverable administrator entry, a server-side authorization test, a state/error-path test, and one browser journey using real Prisma data.

## Completion Gate

The administrator API is ready for a new frontend only when it can independently create a class, enroll students, publish a complete work order, review a real student submission, export a gradebook and reject every cross-room or student-originated administrative request.
