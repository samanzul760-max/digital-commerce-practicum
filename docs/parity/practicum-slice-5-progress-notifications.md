# practicum-slice-5-progress-notifications parity audit - 2026-07-22 (updated)

Skill: practicum-slice-5-progress-notifications
Local checks: green
Case session: user-waived
Waiver approved at: 2026-07-22T12:00:00+08:00
Waiver evidence: ASSUME-S5-001 is not a case-site claim; CASE-S5-002 notification bell observed via shizhanbao-reference on 2026-07-20; dropdown implemented
OpenCLI doctor: not-applicable
Browser: Microsoft Edge

| Feature ID | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| ASSUME-S5-001 | OWNER/STUDENT | N/A：批准的本地原型进度与通知行为 | `/practicum/progress`、`/practicum/notifications`、`/practicum/data-center` | not-applicable | 14/14 focused tests green; 79/79 full E2E green |
| CASE-S5-002 | all | notification bell icon with unread count badge, dropdown with mark-all-read and view-all actions | topbar bell with badge + dropdown (mark-all-read, view-all, notification items with read/unread) | functionally-close | bell icon, badge, dropdown title "消息通知", mark-all-read, view-all, destination-error for blocked routes all implemented |

## Completed behaviors (2026-07-22 update)

| # | Behavior | Test | Status | Key files |
|---|---|---|---|---|
| S5-01 | Plan percentage counts required published activities only | progress-notifications.spec.ts L8 | green | `usePracticumStore.ts` |
| S5-02 | Student progress: plan/module/unit/returned/rubric/evidence | progress-notifications.spec.ts L40, L149 | green | `progress.vue`, `usePracticumStore.ts` |
| S5-03 | Teacher view: completion/pending/status/weak-rubric | progress-notifications.spec.ts L67, L168 | green | `progress.vue`, `usePracticumStore.ts` |
| S5-04 | Every chart has equivalent accessible data table | (embedded) | green | `progress.vue`, `data-center.vue` |
| S5-05 | Event generation: publish/submit/return/grade/deadline | progress-notifications.spec.ts L89, L185 | green | `types.ts`, `usePracticumStore.ts`, `notifications.vue` |
| S5-06 | Unread/read state, mark-one, mark-all | (embedded) | green | `notifications.vue`, `usePracticumStore.ts` |
| S5-07 | Deep links with role-visibility validation | progress-notifications.spec.ts L204 | green | `notifications.vue`, `usePracticumStore.ts` |
| S5-08 | Progress/notification state survives reload | (embedded) | green | `usePracticumStore.ts` (localStorage) |
| S5-09 | Data center: overview + drill-down entry points | progress-notifications.spec.ts L235 | green | `data-center.vue`, `PracticumSidebar.vue` |
| S5-10 | Plan comparison, anonymized feed, sortable ranking | progress-notifications.spec.ts L253 | green | `data-center.vue` |
| S5-11 | CSV export with two-step confirmation | progress-notifications.spec.ts L278 | green | `data-center.vue` |
| S5-12 | Complete state coverage + notification dropdown | progress-notifications.spec.ts L304 | green | `progress.vue`, `notifications.vue`, `data-center.vue`, `PracticumTopbar.vue` |

## Slice 5 gate summary

- BDD skeleton auto self-check: S5-01 through S5-12b each 10/10
- Focused tests: `progress-notifications.spec.ts` 14/14 green
- Full practicum E2E: 79/79 green
- Typecheck: green
- Build: green
- Progress: required published activities only; default required=true for unconfigured nodes
- Notifications: idempotent (publish→STUDENT, submit→OWNER, return→STUDENT, grade→STUDENT, deadline→STUDENT)
- Read state: unread/read, mark-one, mark-all with count
- Topbar: bell icon with badge + CASE-S5-002 dropdown (mark-all-read, view-all, destination-error)
- Data center: overview metrics, plan comparison, anonymized activity feed, sortable ranking, drill-down links, two-step CSV export
- All routes: loading, empty, no-result, forbidden, unread/read, export-pending/success/error, destination-error states
- No TEACHER/MENTOR identity leak
- No szmy2 modification

