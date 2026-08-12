# LearnEC Student API Taskbook

## Purpose and Boundary

This taskbook owns the student-facing learning backend. It is not a simplified demo dashboard: it is the durable record of what a learner was assigned, what they studied, what they did in a controlled sandbox, what they submitted, what feedback they received and how their skills developed.

Students never create their own commercial shop or bypass teaching scope. Every learning action begins from an administrator-published `StudentTask` and is bound to that task.

## Student Capability Map

| Capability | Detailed platform behavior | Required backend result |
|---|---|---|
| Personal home and todo | Show actionable tasks, returned work, upcoming deadlines, recent feedback, completion summary and learning calendar. | Query only the current student's tasks/events; no static KPI or fake calendar entries. |
| Learning plans and curriculum | Browse only published plans and assigned work, inspect module structure, objectives, prerequisites, media and activity availability. | Student-safe projection hides answers, internal reviewer notes and private resources. |
| Resource and application center | Browse authorized software, courses, training, cases and tools; filter by type/tag/status; open only approved resources. | Every resource access checks student room/class entitlement and visibility state. |
| Task guide | Read objectives, required steps, scoring guidance, due date, time limit, expected evidence and previous feedback. | Guide is generated from the frozen assignment snapshot, not mutable template data. |
| Learning position | Start a task, record reading/video position, task heartbeat, visited sections and completed learning steps. | Events are append-only where meaningful and deduplicated where heartbeat is noisy. |
| Controlled sandbox | Complete store basics, product management, store decoration, marketing and business analytics exercises. | Sandbox session and snapshot are scoped by `studentTaskId`; no other student's data or real merchant data is reachable. |
| Questions and practice | Answer objective/subjective questions, view allowed attempts, enforce time limit and receive objective score where configured. | Server validates answer schema, attempt count, deadline and automatic scoring; it never returns answer keys. |
| Drafts and evidence | Save text, links, structured fields and sandbox progress before final hand-in; resume after refresh/device change. | Drafts are Prisma records and can never change a final submission version. |
| Submission | Submit required evidence, attachments and completed parts; inspect immutable submission versions. | Requires idempotency key; checks missing parts, task state, deadline and dependency state in one transaction. |
| Return and resubmission | Read return feedback, edit allowed content and create a new submission version. | Old submission versions remain visible; only `RETURNED` task state permits resubmission. |
| Grades and feedback | Read automatic/manual/total score, rubric feedback, grade revision context and grading time. | Student can read only their own grades after release; score calculations are server-owned. |
| Personal analytics | Review completion rate, task timeline, per-skill strengths/needs, plan drill-down and score trend. | Aggregates use real task, event, submission and grade records; empty data is explicitly empty. |
| Notifications | Receive publish, deadline, return, grade, announcement and competition notifications; list, mark read and open authorized target. | Notification target is checked again on deep-link access. |
| Competition participation | See only eligible competitions, register within the window, complete assigned entry tasks, submit and read released personal result. | Registration and entry state are scoped; competitors cannot inspect peers' evidence or results. |
| Profile and classroom identity | Read own account, class and group memberships; update only approved profile fields. | No role or group self-escalation; updates are validated and audited where needed. |

## Canonical Student APIs

| Area | API contract |
|---|---|
| Home | `GET /api/center/overview`, `GET /api/center/todos`, `GET /api/center/calendar` |
| Plans/resources/apps | `GET /api/center/plans`, `/plans/:id`, `/resources`, `/applications` |
| Assigned work | `GET /api/center/assignments`, `GET /api/center/student-tasks/:id`, `POST /start` |
| Learning and sandbox | `POST /api/center/student-tasks/:id/events`, `/draft`, `/sandbox-snapshots`, `GET/POST /sandbox-session` |
| Questions/submissions | `POST /api/center/student-tasks/:id/attempts`, `POST /submissions`, `GET /api/center/submissions/:id` |
| Results/data | `GET /api/center/grades`, `/data`, `/data/skills`, `/data/plans/:id` |
| Notifications/profile | `GET/POST /api/center/notifications`, `POST /notifications/:id/read`, `GET/PATCH /api/auth/profile` |
| Competition | `GET /api/center/competitions`, `POST /competitions/:id/register`, `GET /competitions/:id`, `POST /competitions/:id/submissions`, `GET /competitions/:id/result` |

All planned endpoints are additions to the canonical layer. Existing `/api/center/assignments` and `/api/center/student-tasks/*` remain the starting implementation and are not replaced with browser state.

## Key Student Flows

### Learning a published task

1. Home returns only tasks available to the current student, grouped by locked, available, in-progress, submitted, returned and graded states.
2. Opening a task checks entitlement, release time, close time and dependencies. It then records a start event once.
3. The task guide loads the publication snapshot. The student may save drafts and sandbox snapshots at any point.
4. Required task parts are validated by the server. A missing field response identifies the safe section key and label, not a private answer.
5. Final submit atomically stores submission parts, increments version, records an event and changes task state to `SUBMITTED`.

### Reading feedback and improving work

1. A returned-task notification leads to the student's own task or submission detail.
2. The student reads feedback associated with the returned version, edits current draft/evidence and resubmits.
3. The new version is immutable after submission. The prior returned version remains part of the evidence history.
4. When graded, the student can see released score, feedback and allowed rubric detail, but never staff-only notes or other learners' data.

### Personal data

1. Completion is calculated from the student's assigned tasks, not global class totals.
2. Skill dimensions derive from configured task sections and graded evidence, with a documented zero-data result.
3. The student can drill down from a score trend to the task/submission version that produced it.

## Public Research Addendum: Mature Student Learning Record

Public university requirements describe a learner experience that combines task-driven practice with durable learning evidence. This expands LearnEC beyond a static course page, but it remains a teaching platform: all actions are authorized assignment work, not a free commercial storefront.

| Learner capability | Mature behavior expected from the API | LearnEC boundary |
|---|---|---|
| Course and knowledge center | Discover only authorized course outlines, guide books, policies, videos, slides, documents, cases and topic/question banks; resume learning from the relevant task. | Resource visibility and download/open operations are room/class checked. Media access is logged where the curriculum requires it. |
| Clear task lifecycle | See released, locked, in-progress, submitted, returned, graded and closed states; see due time, time limit, prerequisite and next safe action. | State is calculated from server records. A client may not change a state locally or infer access to an unreleased task. |
| Guided scenario practice | Complete a task guide step by step inside a domain package such as store operation, data operation, customer service, cross-border or live-commerce. | Every scenario is a `studentTaskId`-bound sandbox session; it may produce structured evidence but cannot use a separate grade/permission store. |
| Practice, assessment and correction | Complete objective/subjective questions and scenario evidence; view allowed attempt result, teacher feedback, return reason and prior submitted versions; improve and resubmit when returned. | The server enforces attempt/time/deadline policies, hides answer keys, preserves prior versions and exposes only released personal feedback. |
| Personal learning dossier | View task trajectory, learning frequency, progress, score and section/skill drill-down; optionally view a class comparison only when a room policy enables it. | No fabricated score, ranking or calendar data. Definitions and zero-data states are explicit; peer details remain inaccessible. |
| Classroom and notification connection | Receive task, announcement, deadline, return, grade and eligible competition notifications; deep links always revalidate current authorization. | Notifications record a durable target/type/time/read state. A notification never grants access by itself. |

### Research Traceability

- [Xichang University](https://www.xcc.edu.cn/dzsw/697047/697053/707950/index.html) publicly lists student training tasks, course question banks, knowledge center, training trajectory, rankings and downloads, alongside complete task guides and generated experiment reports.
- [Chongqing public procurement requirements](https://www.cqip.com.cn/upfiles/202503/20250305173834987.pdf) publicly require self-study, scenario tasks, task-center guidance, operation recording, personal training results, answer/analysis after assessment and learning/task trend data.
- [Shanghai Business School's 2024 live-commerce procurement](https://www.sicp.edu.cn/html/162/2024-06-25/content-7850.shtml) publicly requires clear student task labels for completed, incomplete and reviewed work, plus automatic/manual assessment.
- [Shenzhen University](https://eme.szu.edu.cn/info/1126/1673.htm) publicly describes separate specialized exercises delivered through a common teaching/assessment/management layer; this supports a single student learning record across packages.

## Student Task Sequence

### Task U1: Student-safe read models

- [ ] Write failing tests for unpublished content, cross-student task IDs, closed tasks, missing prerequisite and answer-key leakage.
- [ ] Implement `overview`, plan/resource/application discovery, assignment list and task detail projections from Prisma records.
- [ ] Verify direct API/URL access returns no unauthorized record and no hidden answer data.

### Task U2: Durable learning and sandbox evidence

- [ ] Write failing tests for duplicate start, invalid event payload, foreign task snapshot, expired sandbox session and conflicting draft update.
- [ ] Implement event, draft, sandbox session and snapshot services scoped to `studentTaskId`.
- [ ] Verify refresh/device recovery using an isolated database rather than localStorage.

### Task U3: Practice and submission integrity

- [ ] Write failing tests for invalid attempt count, timeout, missing required part, repeated idempotency key, locked task and concurrent submit.
- [ ] Implement attempt validation, objective grading, immutable submission versions and precise state transitions.
- [ ] Verify the administrator review queue sees the submitted evidence exactly once.

### Task U4: Feedback, personal data and notifications

- [ ] Write failing tests for another student's grade/data/notification access, returned-task resubmission and empty personal analytics.
- [ ] Implement released grade projection, personal aggregation, notification list/read and authorized deep links.
- [ ] Verify grade/return writes made by the administrator surface to the student without exposing staff-only information.

### Task U5: Competition participation

- [ ] Write failing tests for ineligible registration, duplicate registration, closed window, peer result access and unreleased result access.
- [ ] Implement eligible competition list, registration, entry-task handoff, submission and personal result projection.
- [ ] Verify competition submissions reuse the common version/evidence/grade contract.

## Student Parity Gate

The student application matches the public teaching-platform baseline only when the learner can find and complete this whole path without relying on demo data:

- [ ] Open a real home/todo/calendar view with only their assigned work, clear state labels, deadlines, prerequisites and recent feedback.
- [ ] Read authorized course/task-book resources, including objectives, knowledge preparation, steps, media, practice and assessment instructions.
- [ ] Enter the appropriate controlled scenario package from an assigned task, save durable progress/evidence, and resume on another device/session.
- [ ] Complete allowed attempts, submit required evidence, see an immutable submission history and resubmit only after a documented return.
- [ ] Read released personal automatic/manual/total score, rubric feedback and history without seeing answer keys, staff notes or peer records.
- [ ] Inspect personal progress, task trajectory and skill/section detail sourced from persisted data; zero-data states remain honest.
- [ ] Receive and safely open task, classroom, deadline, feedback, grade and eligible competition notifications.

For every checkbox, acceptance must include: a discoverable student entry, a student-ownership authorization test, an invalid-state/error-path test, a real-data browser journey and a 390px no-horizontal-overflow assertion.

## Completion Gate

The student API is ready for a new frontend only when a student can safely complete the full lifecycle from published assignment through sandbox evidence, submission, returned revision, grade, notification and personal analytics, while every cross-student, cross-class and hidden-content request is rejected by the server.
