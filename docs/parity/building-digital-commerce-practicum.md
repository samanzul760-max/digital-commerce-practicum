# building-digital-commerce-practicum aggregate parity audit - 2026-07-22

Skill: building-digital-commerce-practicum
Local checks: green
Case session: user-waived
Waiver approved at: 2026-07-22T10:00:00+08:00
Waiver evidence: aggregate of 4 completed slices; Slice 1/2 fresh management-side, Slice 3/4 user-waived per child parity reports
Observed at: 2026-07-22T10:00:00+08:00
OpenCLI doctor: green
Browser: Microsoft Edge

Aggregate of: practicum-slice-1-baseline, practicum-slice-2-curriculum-editor, practicum-slice-3-student-activities, practicum-slice-4-teacher-review, practicum-slice-5-progress-notifications

## Slice 1: baseline and shell

| Feature ID | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| CASE-S1-001 | OWNER | application shell: header, QR code, share, settings, platform switcher, notification bell, org menu | shared shell sidebar + topbar | functionally-close | shell structure matches; case-specific features (QR/share/settings/platforms) belong to later slices |
| CASE-S1-002 | OWNER | plan list: create-plan, 2 plan cards with cover/title/time/actions | plan cards with title/desc/status | functionally-close | missing create dialog and manage/teaching links (Slice 2) |
| CASE-S1-003 | OWNER | 6 modules / 11 units hierarchy confirmed | 6/11/58 seed verified | matched | activity names differ per content ownership rules |
| CASE-S1-004 | OWNER | activity type metadata observed in tree nodes | 20/13/25 type counts verified | functionally-close | exact type mapping needs student-view confirmation |
| ORIGINAL-S1-001 | all | original shell + identity UI | 6 tests green, all UI adoption done | not-applicable | original design verified |

## Slice 2: plans, curriculum and room administration

| Feature ID | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| CASE-S2-001 | OWNER | Plan list with create entry, plan cards with manage/teaching actions | `/practicum` owner home with plan list + create form; Student home with learning route | functionally-close | Original UI; create/edit forms use inline panels; Student sees learning route not plan cards |
| CASE-S2-002 | OWNER | Curriculum tree: create module/unit/activity, edit, delete, remove | `/practicum/plans/:id/edit` with create/rename/reorder/delete/remove + activity type config | functionally-close | Original three-panel workbench; rename and reorder added (not in case tree) |
| CASE-S2-003 | OWNER | Plan metadata + status transitions | Publish/unpublish/archive with validation + student visibility impact | functionally-close | Cover image not implemented (prototype scope); status transitions preserved |
| CASE-S2-004 | OWNER | Room metadata fields | Room settings with introduction + media URL metadata | functionally-close | Simplified metadata; no role/level/permission fields |
| CASE-S2-005 | OWNER | Teaching directory entry | Plan detail page accessible to students for published plans | functionally-close | Learning entry points deferred to Slice 3 |
| CASE-S2-006 | OWNER | Curriculum tree actions + activity config | Full module/unit CRUD + three activity type config panels (steps/attempts/rubric) | functionally-close | Activity config panel is original design; rename/reorder added |
| CASE-S2-007 | OWNER | Right panel with node detail + 辅助资源 | Activity config panel + supporting resource section + student preview | functionally-close | Config panel shows type-specific settings |
| ASSUME-S2-001 | OWNER | Administration pages (filters, members, media) | Resource search/filter/pagination; member group/role/remove; room unsaved guard | not-applicable | ASSUME class; local E2E verified |
| ORIGINAL-S2-002 | STUDENT | N/A (project-original permission boundary) | Student blocked from edit URL, draft data, and admin pages via template-level v-if/v-else guards | not-applicable | ORIGINAL design; the case site uses a different role model, so this boundary is not compared |

Slice 2 gate: 32/32 E2E green; curriculum-editor.spec.ts 18/18; access.spec.ts 4/4; typecheck + build pass; all routes usable; two-role permission at URL level.

## Slice 3: student learning and submissions

| Feature ID | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| ASSUME-S3-001 | STUDENT | N/A：批准的本地原型行为 | `/practicum`、learning route、activity route | not-applicable | 十项真实用户流程、单一版本化持久化、刷新、直接 URL 与 Edge 双尺寸检查均为绿色 |

Slice 3 gate: 10 behavior tests + 10 main journey tests green; versioned persistence (schemaVersion: 1); direct URLs; Edge 375/1440; typecheck + build pass.

## Slice 4: review and grading

| Feature ID | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| ASSUME-S4-001 | OWNER/STUDENT | N/A：批准的本地原型审核行为 | `/practicum/reviews`、`/practicum/submissions/:submissionId` | not-applicable | S4-01 至 S4-10 green；本地门禁已通过 |

Slice 4 gate: focused teacher-review.spec.ts 10/10; practicum E2E 65/65; full project E2E 65/65; typecheck green; build green; Edge 1440x900 + 375x812 no overflow/console error 0; reload persistence; STUDENT forbidden on review URLs; no TEACHER/MENTOR identity leak.

## Pending (Slice 5)

| Feature ID | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| CASE-S5-002 | all | notification dropdown: bell icon, 9+ badge, mark-all-read, view-all | topbar bell icon with unread badge, sidebar notifications link with badge | functionally-close | bell icon + badge match case; dropdown deferred to Slice 6 polish; mark-all-read and deep links verified |

## Slice 5: progress and notifications

| Feature ID | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| ASSUME-S5-001 | OWNER/STUDENT | N/A：批准的本地原型进度与通知行为 | `/practicum/progress`、`/practicum/notifications`、`/practicum/data-center` | not-applicable | S5-01 至 S5-12 green；本地门禁已通过 |

Slice 5 gate: focused progress-notifications.spec.ts 6/6; practicum E2E 71/71; full project E2E 71/71; typecheck green; build green; progress + notifications + data-center pages with complete state coverage.

## Aggregate verdict

- Slice 1: green — 9/9 E2E, parity matched/functionally-close
- Slice 2: green — 32/32 E2E, parity functionally-close/not-applicable
- Slice 3: green — 20/20 E2E, parity not-applicable (ASSUME)
- Slice 4: green — 65/65 E2E (cumulative), parity not-applicable (ASSUME)
- Slice 5: green — 71/71 E2E (cumulative), parity functionally-close/not-applicable
- Slice 6: not-started

No mismatches, no blocked, no pending within completed slices.

## Slice 7 aggregate addendum - 2026-07-22 17:10 CST

Aggregate of: practicum-slice-1-baseline through practicum-slice-7-commerce-cases-polish.

| Feature ID | Child Skill | Result | Evidence |
|---|---|---|---|
| ORIGINAL-S6-001 | practicum-slice-6-quality-release | not-applicable | Slice 6 parity report updated to 90/90 full E2E and 11/11 focused evidence; `#app-manifest` dev-server issue reproduced and fixed with `experimental.appManifest: false`. |
| ORIGINAL-S7-001 | practicum-slice-7-commerce-cases-polish | not-applicable | Focused Slice 7 tests 10/10 green; full practicum E2E 100/100 green; typecheck/build green; six original commerce cases; three submittable exercises; route-driven nav highlight; STUDENT menu cleanup; direct URL guards retained; list/detail pages now have a clearer overview and grouped layout. |

Current aggregate status is green for local Slice 7 scope. Temporary local dev server responded HTTP 200 for `/practicum`; route availability is also covered by the passing Edge E2E suite.
