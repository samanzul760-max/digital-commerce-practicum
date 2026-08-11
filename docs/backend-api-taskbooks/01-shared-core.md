# LearnEC Shared Backend Core Taskbook

## Purpose

This taskbook owns the single source of truth shared by the administrator and student ends. It prevents the platform from becoming two disconnected products: an administrator can publish only data that a student can learn, submit, receive feedback on, and see reflected in class analytics.

This is backend-only work. Frontend applications consume the contracts below but must not own business state, scores, permissions, or submission versions.

## Non-Negotiable Rules

- PostgreSQL and Prisma are the only source of truth for accounts, memberships, tasks, learning records, submissions, grades, notifications, and audits.
- New platform roles are `ADMIN` and `STUDENT`. Historical roles (`OWNER`, `TEACHER`, `MENTOR`, `ASSISTANT`) are compatibility inputs only and map to administrator permissions during migration.
- Every protected query is scoped by the authenticated user, training room, class, and ownership rule before records are read.
- A browser may cache presentation preferences and an unsent form buffer only. It must never create a task, submission, score, role, or permission locally.
- Old `/api/practicum/*` endpoints remain available until their equivalent Prisma-backed endpoint has passed contract and regression tests. They are then marked deprecated, never silently removed.

## Shared Domain Model

| Domain | Required entities | Responsibility |
|---|---|---|
| Identity | `User`, `UserRoleGrant`, `AuthSession` | Login identity, enabled state, role grants, expiring sessions and CSRF binding. |
| Tenant and classroom | `Organization`, `TrainingRoom`, `Cohort`, `Class`, `ClassEnrollment` | Defines where a user is allowed to see or change teaching data. |
| Member operations | `RoomMember`, `VirtualGroup`, `JoinApplication`, `MemberInvite` | Student membership, group allocation, invitation and approval history. |
| Content | `ResourceCatalogItem`, `MediaResource`, `WorkOrderTemplate`, `TaskSection`, `TaskQuestion`, `SandboxSpec` | Reusable teaching content, media, question schemas, sandbox instructions and rubrics. |
| Delivery | `PlanAssignment`, `PlanAssignmentIdempotencyKey`, `TaskDependency`, `StudentTask` | Frozen class assignment, delivery scope, dependency checks and each student's work instance. |
| Learning evidence | `ActivityLog`, `TaskEvent`, `SandboxSession`, `SandboxSnapshot`, `AutoGradeAttempt` | Durable timeline of learning, saved states, sandbox evidence and objective attempts. |
| Submission and grading | `Submission`, `SubmissionVersion`, `SubmissionPart`, `SubmissionIdempotencyKey`, `Grade`, `GradeRevision`, `GradeItem` | Immutable hand-in versions, evidence parts, score calculation and grading history. |
| Operations | `TrainingRoomSetting`, `ClassAnnouncement`, `TeachingSession`, `ActivityExecution`, `Notification`, `AuditEvent` | Classroom operations, notices, reporting and traceable privileged actions. |
| Competition | `PracticumTemplate`, `Competition`, `CompetitionEntry` | Reusable competition configuration, registration, task entry and controlled result release. |

## Core Workflows and States

### Assignment delivery

```text
Template DRAFT -> READY -> ARCHIVED
PlanAssignment DRAFT -> PUBLISHED -> CLOSED -> ARCHIVED
StudentTask LOCKED -> AVAILABLE -> IN_PROGRESS -> SUBMITTED
                                    -> RETURNED -> SUBMITTED -> GRADED
                                    -> CLOSED
```

1. An administrator builds a versioned template from approved resources, questions and sandbox sections.
2. Publishing validates dates, audience, dependency graph, required sections and score weights. It snapshots the template into a `PlanAssignment`.
3. The publish transaction creates one scoped `StudentTask` per eligible learner. Retrying the same request returns the original result through an idempotency key.
4. A student may read only their task snapshot. A changed template never rewrites an in-progress student task.
5. A returned task accepts a new immutable submission version; a graded task remains auditable.

### Submission and review handoff

```text
Student saves draft/events/snapshots
  -> service validates required evidence
  -> SubmissionVersion + SubmissionPart + TaskEvent transaction
  -> administrator review queue
  -> grade or return transaction
  -> student notification and personal data refresh
```

- A submission belongs to exactly one `StudentTask`.
- `expectedVersion` prevents a reviewer from grading evidence that changed after it was opened.
- Automatic score is calculated from the current submission parts; manual score is constrained to 0-100.
- Total score is `automaticScore * automaticWeight / 100 + manualScore * manualWeight / 100` using weights frozen at publication.
- Return feedback is mandatory. Grade and return writes append `TaskEvent` and `AuditEvent` records.

### Competition lifecycle

```text
Competition DRAFT -> PUBLISHED -> CLOSED -> ARCHIVED
Entry NOT_REGISTERED -> REGISTERED -> IN_PROGRESS -> SUBMITTED -> GRADED -> RESULT_RELEASED
```

Competition work must reuse class membership, `StudentTask`, submission versions and grade records. It must not create a parallel score or evidence store.

## Security and Contract Rules

| Concern | Required behavior |
|---|---|
| Authentication | `practicum_session` is HttpOnly, SameSite Lax and expires server-side. Login errors never disclose whether an account exists. |
| Authorization | `ADMIN` writes and reads only authorized rooms/classes. `STUDENT` reads and writes only their own tasks, submissions and profile data. Cross-scope resources return the documented forbidden/not-found contract. |
| CSRF | All authenticated writes require the session-bound CSRF token. Login and logout have their own safe contract. |
| Idempotency | Publish, invitation, account creation, submission, notification dispatch and export requests accept an `Idempotency-Key` where replay could duplicate data. |
| Optimistic concurrency | Template edits, task edits, review writes and membership bulk operations use `version` or `expectedVersion`; stale writes return `409 VERSION_CONFLICT`. |
| Audit | Account changes, role changes, invitations, content publish/withdraw, grading, returning, competition result release and export append an `AuditEvent`. |
| Error format | API failures return an HTTP status plus stable `data.code`, such as `AUTH_REQUIRED`, `ADMIN_REQUIRED`, `ROOM_SCOPE_FORBIDDEN`, `STATE_INVALID`, `VERSION_CONFLICT`, `IDEMPOTENCY_KEY_REQUIRED`. |

## Canonical API Boundary

```text
/api/auth/*                         shared identity and session
/api/admin/classes/*                class, cohort, membership and groups
/api/admin/resources/*              resource catalog and media metadata
/api/admin/tasks/*                  templates, assignments, publication and classroom delivery
/api/admin/reviews/*                evidence, grading and return
/api/admin/data/*                   aggregate data, audit and exports
/api/admin/competitions/*           competition administration
/api/center/*                       student read/write capabilities
```

The frontend must use these canonical endpoints. `/api/practicum/*` remains a compatibility facade while its data is migrated; new frontend work must not make it the permanent contract.

## Public Research Baseline (2026-08-11)

This taskbook is deliberately based on public descriptions of university ecommerce teaching systems and procurement requirements, rather than a consumer-store demo. The sources below describe capability expectations; they are not copied UI or a claim that every feature is already implemented in LearnEC.

| Observed public capability | LearnEC backend decision |
|---|---|
| University procurement and laboratory pages consistently separate teaching management from the simulation environment: teacher/class/student management, task and question management, resource management, student task history, and assessment. | Keep the canonical control plane under `/api/admin/*` and bind every learner action to `StudentTask`; no sandbox owns its own account, grade, or permission store. |
| Mature offerings use a complete task guide: objective, prerequisite knowledge, steps, expected analysis/decision, practice and question bank. | Model these as versioned `TaskSection`, `TaskQuestion`, `SandboxSpec`, required evidence and frozen publication snapshots, rather than a single free-text task description. |
| Procurement requirements commonly ask for automatic scoring plus teacher scoring, detailed operation records, error analysis, score release, class analytics and exports. | Preserve event/evidence provenance; calculate automatic scores server-side, store manual review/revisions separately, and make released grade, export, and analytic definitions auditable. |
| Cross-border, store operation, data-operation, customer-service and live-commerce systems are delivered as different occupational scenarios. | Treat these as governed `SandboxSpec`/resource packages with a common submission and grade contract. Do not create parallel tables or fake operational data for each scenario. |
| Classroom delivery frequently includes classroom opening, announcements, assignments/exams, interaction and attendance/progress analytics. | Use `TeachingSession`, `ClassAnnouncement`, `ActivityExecution`, `Notification` and `TaskEvent` as shared durable records, all scoped to room/class. |

### Public Sources

- [Xichang University, ecommerce series training platform](https://www.xcc.edu.cn/dzsw/697047/697053/707950/index.html): publicly lists teaching management, class/student/task/resource management, student task/question/knowledge/trajectory views, automatic experiment reports and scoring.
- [Shanghai Business School vocational college procurement notice](http://xxgk.sicp.edu.cn/2020_10/29_14/content-23035.html): specifies the teaching-management plus training-system split, batch student setup, task/question/resource management and complete task guides.
- [Shenzhen University laboratory page](https://eme.szu.edu.cn/info/1126/1673.htm): describes unified access to multiple specialized training systems with curriculum, online assessment, interaction and integrated teaching support.
- [Chongqing Institute of Public Resources procurement addendum (PDF)](https://www.cqip.com.cn/upfiles/202503/20250305173834987.pdf): specifies classroom opening, tasks/exams/announcements, operation records, automatic plus manual scoring, score release, analytics and teaching resources.
- [Shanghai Business School live-commerce system procurement](https://www.sicp.edu.cn/html/162/2024-06-25/content-7850.shtml): specifies task-state labels, rubric-based automatic/manual scoring, class/experiment/grade/question/resource management, and data dashboards.

Facts above are public source observations. The migration order and data model choices below are LearnEC recommendations.

## Migration Tasks

### Task S1: Freeze the shared contract

- [ ] Create a machine-readable API contract for common pagination, error, date, money/score and idempotency fields.
- [ ] Document the current `/api/practicum/*` to canonical endpoint mapping with one status per capability: `MIGRATING`, `CANONICAL`, `DEPRECATED` or `BLOCKED`.
- [ ] Add contract tests that reject cross-room reads, role escalation, missing CSRF and missing idempotency keys before any migration begins.

### Task S2: Normalize roles and scope helpers

- [ ] Centralize `requireAdmin`, `requireStudent`, room scope, class staff scope and current-user lookup in Prisma-backed helpers.
- [ ] Remove new endpoint dependence on historical `OWNER` checks; preserve them only inside legacy adapters.
- [ ] Add authorization tests for administrator room scope, student ownership, unauthenticated access and direct URL/API access.
- [x] Add real grade release semantics to `Grade` through `releasedAt` and `releasedById` (or an equivalent explicit state). Saving or revising a grade leaves it unreleased, revising a released grade automatically withdraws it, release is allowed only after a grade exists, and withdrawal requires a currently released grade. No unreleased score, feedback, revision or grade object may be returned by any student home, assignment list, task detail, submission detail or compatibility endpoint.
- [x] Freeze one shared student-task scope service for canonical and compatibility APIs. Access requires all of: `StudentTask.studentId = current user`, `StudentTask -> PlanAssignment -> Class`, a current active `ClassEnrollment` with role `STUDENT`, `Class.roomId` in the authenticated user's current training-room scope, and `Class.organizationId = TrainingRoom.organizationId`. A historical assignment alone never preserves access after enrollment, room or organization scope is invalidated.

#### S2 grade release state contract

```text
Grade absent --save grade--> UNRELEASED
UNRELEASED --revise--> UNRELEASED
UNRELEASED --release--> RELEASED
RELEASED --withdraw--> UNRELEASED
RELEASED --revise--> UNRELEASED (automatic withdrawal in the same transaction)
```

- Releasing an already released grade returns `409 GRADE_ALREADY_RELEASED`.
- Withdrawing an unreleased or already withdrawn grade returns `409 GRADE_NOT_RELEASED`.
- Student projections return `grade: null` for an unreleased grade and must not leak its score or feedback through sibling fields, events or replay responses.
- Release, withdrawal and automatic withdrawal append `TaskEvent` and `AuditEvent` records in the same transaction as the `Grade` update.

### Task S3: Complete durable cross-end records

- [ ] Migrate legacy JSON-backed plans, assignments, notifications, resources and submissions into Prisma one domain at a time.
- [ ] Preserve identifiers or create an explicit old-to-new mapping table; never merge records by display name.
- [ ] Make every migration idempotent, reversible through a documented backup, and auditable.

### Task S4: Stabilize cross-end events

- [ ] Define event types for publication, start, save, submit, return, grade, announcement, invitation and competition result release.
- [ ] Ensure business writes update the primary record, event record, notification request and audit record in one transaction where required.
- [ ] Add replay tests for duplicate POSTs and race tests for simultaneous submit/grade/return requests.

## Public-Parity Acceptance Matrix

The public platforms researched above are the capability benchmark for LearnEC. “Parity” means a usable, testable teaching workflow under LearnEC's own data model and interface; it does **not** mean copying a supplier's source code, branding, wording, or reproducing unsupported commercial integrations.

| Acceptance dimension | Minimum parity requirement | Evidence required before marking complete |
|---|---|---|
| Functional entry | Each approved capability has a discoverable entry in the correct role's route/menu and an API contract. Unavailable capabilities show an honest planned state, not a fake success path. | Route/menu inventory, API contract test and role access test. |
| Teaching workflow | An administrator can configure content/class scope, publish it, and a student can learn, practice, submit, receive review and inspect their own result. | Seeded browser E2E path plus persisted Prisma records at each handoff. |
| Process evidence | Time, learning events, attempts, sandbox evidence, versions, feedback and score history can be inspected at the permitted scope. | API assertions proving evidence survives refresh, resubmission and review revision. |
| Assessment | Objective rules and teacher rubric scoring may coexist; scoring, returning, release and export have documented states and definitions. | Boundary/rubric/weight tests, grade revision audit test and exported-data check. |
| Classroom operation | Class, group, task, announcement, teaching session and learning progress form one flow rather than disconnected screens. | Scope tests and a classroom-to-student-notification E2E path. |
| Learning analytics | Personal/class indicators link back to task, submission and grade source records; empty data and denominators are explicit. | Aggregate reconciliation tests and permission tests for drill-down/export. |
| Specialty and contest packages | Cross-border, data operation, customer service, live-commerce, competition and certification reuse shared identity, task, evidence and grade stores. | Contract test showing no parallel score/evidence tables and role/scope tests for each package. |
| Experience and responsive access | The forthcoming frontend exposes the complete workflow without dead links, hidden critical actions or 390px horizontal overflow. | Route crawl, role E2E suite, 390px viewport assertions and visual review against the approved frontend design. |

No capability is “complete” because its page renders or its API returns `200`. It becomes complete only after the relevant row has all evidence above.

## Completion Gate

This taskbook is complete only when all shared writes use Prisma transactions, both roles have server-side scope tests, every state transition has a rejection test, and a seeded end-to-end path proves: publish -> student task -> submission -> review -> grade -> student data -> export.
