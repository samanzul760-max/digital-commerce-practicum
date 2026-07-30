# Institution-Grade Practicum P0 Design

## Goal

Replace the single-file demonstration data model with a relational foundation that supports semesters, classes, teacher-scoped access, plan delivery, and one task record per student without removing existing plan, review, or student flows.

## Scope

This slice implements P0 only. Teacher workbench screens, visual roadmap, charts, reminders, and asynchronous exports remain later slices. Existing JSON seed data remains available only for local development migration and tests.

## Architecture

Nuxt server routes will use Prisma against PostgreSQL. Domain services own authorization and state transitions; route handlers only parse input and map domain errors to HTTP responses. Browser localStorage remains limited to UI preferences and drafts that are explicitly non-authoritative.

## Data Model

- `Organization` owns `Cohort` (term or intake) and `TrainingRoom`.
- `Class` belongs to one organization and cohort.
- `ClassEnrollment` connects a user to a class with `STUDENT`, `TEACHER`, `ASSISTANT`, or `HEAD_TEACHER` scope.
- `Plan` remains reusable course content. `PlanAssignment` delivers one published plan to one or more classes, with `availableAt`, `dueAt`, `latePolicy`, and publication state.
- `TaskDependency` records prerequisites between activity nodes.
- `StudentTask` is unique by `(planAssignmentId, studentId, activityId)`. It owns status, availability, deadline, and progress.
- `Submission` belongs to one student task. `SubmissionVersion`, `SubmissionAsset`, `Grade`, `GradeItem`, and `AuditEvent` preserve the assessment history.

## Authorization

- `OWNER` can administer all organization data within its assigned organization scope.
- `TEACHER`, `MENTOR`, `ASSISTANT`, and `HEAD_TEACHER` may read and act only through an active class enrollment; teachers may create and assess only assignments they are authorized to manage.
- `STUDENT` may read only assigned, available content and only their own task, submission, feedback, and grade records.
- Every database query is constrained by organization, training room, class, and user scope before the entity ID is resolved.

## Migration and Compatibility

1. Add Prisma schema and migrations without deleting current JSON files.
2. Add a development seed command that maps the current room, plans, nodes, activities, sample users, and sample member to relational records.
3. Move one vertical path first: a teacher assigns a published plan to a class and a student receives distinct task rows.
4. Move submission creation and review to `StudentTask` IDs, then deprecate the activity-keyed JSON submission map.

## API Contract

- `POST /api/practicum/classes` creates a class in a cohort.
- `POST /api/practicum/classes/:classId/enrollments` enrolls a member or teaching staff scope.
- `POST /api/practicum/plan-assignments` publishes a plan to classes with availability and due dates.
- `GET /api/practicum/teacher/classes` returns only the current teacher's authorized classes.
- `GET /api/practicum/student/tasks` returns only the student's generated task instances.
- `POST /api/practicum/student-tasks/:taskId/submissions` creates an immutable submission version.

## Failure Rules

- Cross-class or cross-room IDs return `404`, avoiding disclosure of existence.
- Invalid role, class scope, unpublished plan, unavailable task, unmet dependency, or closed deadline returns a stable `403` or `409` code.
- Unique indexes prevent duplicate enrollment, plan delivery, task creation, and duplicate submission requests.
- Writes use database transactions and idempotency keys.

## Acceptance Evidence

1. A teacher can create a class-scoped delivery only for an authorized class.
2. Two students assigned the same activity receive separate task and submission records.
3. A teacher from another class cannot list, grade, or export the class's data.
4. A student cannot access a task before its availability time or unmet prerequisite.
5. Existing owner plan creation and current student learning routes remain functional during the migration.
