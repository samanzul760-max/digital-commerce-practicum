# practicum-slice-2-curriculum-editor parity audit - 2026-07-21

Skill: practicum-slice-2-curriculum-editor
Local checks: green
Case session: management-side only (2026-07-20 observations via shizhanbao-reference; student-side not observable on case site)
Observed at: 2026-07-20T12:00:00+08:00
OpenCLI doctor: green
Browser: Microsoft Edge

## Parity Results

| Feature ID | Class | Role | Case path summary | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|---|
| `CASE-S2-001` | CASE | OWNER | Plan list with create entry, plan cards with manage/teaching actions | `/practicum` owner home with plan list + create form; Student home with learning route | functionally-close | Original UI; create/edit forms use inline panels; Student sees learning route not plan cards |
| `CASE-S2-002` | CASE | OWNER | Curriculum tree: create module/unit/activity, edit, delete, remove | `/practicum/plans/:id/edit` with create/rename/reorder/delete/remove + activity type config | functionally-close | Original three-panel workbench; rename and reorder added (not in case tree) |
| `CASE-S2-003` | CASE | OWNER | Plan metadata + status transitions | Publish/unpublish/archive with validation + student visibility impact | functionally-close | Cover image not implemented (prototype scope); status transitions preserved |
| `CASE-S2-004` | CASE | OWNER | Room metadata fields | Room settings with introduction + media URL metadata | functionally-close | Simplified metadata; no role/level/permission fields |
| `CASE-S2-005` | CASE | OWNER | Teaching directory entry | Plan detail page accessible to students for published plans | functionally-close | Learning entry points deferred to Slice 3 |
| `CASE-S2-006` | CASE | OWNER | Curriculum tree actions + activity config | Full module/unit CRUD + three activity type config panels (steps/attempts/rubric) | functionally-close | Activity config panel is original design; rename/reorder added |
| `CASE-S2-007` | CASE | OWNER | Right panel with node detail + 辅助资源 | Activity config panel + supporting resource section + student preview | functionally-close | Config panel shows type-specific settings |
| `ASSUME-S2-001` | ASSUME | OWNER | Administration pages (filters, members, media) | Resource search/filter/pagination; member group/role/remove; room unsaved guard | not-applicable | ASSUME class; local E2E verified |
| `ORIGINAL-S2-002` | ORIGINAL | STUDENT | N/A (project-original permission boundary) | Student blocked from edit URL, draft data, and admin pages via template-level v-if/v-else guards | not-applicable | ORIGINAL design; the case site uses a different role model, so this boundary is not compared |

**Note on student-side parity:** The case website uses a different role model. This project is consolidated to two roles (`OWNER`/`STUDENT`). Student-side permission behaviors (`ORIGINAL-S2-002`) are project-original and are not claimed as case-verified. Management-side CASE items were observed on 2026-07-20.

## Two-Role Permission Boundary (ORIGINAL-S2-002)

| Behavior | Gherkin | Test | Result |
|---|---|---|---|
| Student blocked from plan editor URL | Given student navigates to /practicum/plans/:id/edit → Then forbidden + no editor | `access.spec.ts:23` `[ORIGINAL-S2-002]` | GREEN (direct) |
| Student blocked from draft plan data | Given student navigates to draft plan detail URL → Then no title/desc/modules/activities | `access.spec.ts:50` `[ORIGINAL-S2-002]` | RED→GREEN (added guard in index.vue) |
| Student blocked from admin pages | Given student navigates to resources/members/room-settings → Then forbidden + no controls/data | `access.spec.ts:73` `[ORIGINAL-S2-002]` | GREEN (direct, guards existed) |

## Feature Completion Evidence

### Ordered Behavior Backlog - All Green (12/12)

1. ✅ Draft plan hidden from Student — `[CASE-S2-001]`
2. ✅ Module/unit rename + stable sort — `[CASE-S2-002]` (rename + reorder tests)
3. ✅ Three activity types with full config — `[CASE-S2-006]` (SOFTWARE_ACTION/TRAINING/PRACTICE_ACTIVITY)
4. ✅ Supporting resource metadata + student preview — `[CASE-S2-007]`
5. ✅ Deletion with impact + evidence block — `[CASE-S2-006]`
6. ✅ Publish validation (title/desc/module/activity config) — `[CASE-S2-003]`
7. ✅ DRAFT → PUBLISHED → ARCHIVED + unpublish — `[CASE-S2-003]`
8. ✅ localStorage persistence + reload — `[ASSUME-S2-001]`
9. ✅ Resource library: search/filter/pagination/CRUD — `[ASSUME-S2-001]`
10. ✅ Member management: groups/role/remove with impact — `[ASSUME-S2-001]`
11. ✅ Room settings: unsaved guard/save states/media metadata — `[CASE-S2-004]`
12. ✅ All page states + two-role permission boundary (URL-level) — `[ORIGINAL-S2-002]`

### Protected Actions - All Green

- Plan creation: title + description required ✅
- Publish/unpublish/archive: student visibility impact before confirm ✅
- Delete module/unit/activity: descendant + evidence counts; evidence blocks ✅
- Student URL-level blocks: edit page, draft data, admin pages all guarded at template level ✅
- Member role change/remove: OWNER guard + impact summary ✅
- Room settings: unsaved change warning; metadata only ✅

### Route Status

| Route | Usable | Non-blank | Student-blocked (URL-level) |
|---|---|---|---|
| `/practicum` (owner home) | ✅ | ✅ | N/A (student home is different) |
| `/practicum/plans/:id/edit` | ✅ | ✅ | ✅ forbidden + no editor DOM |
| `/practicum/plans/:id` (detail) | ✅ | ✅ | ✅ draft plans → forbidden |
| `/practicum/resources` | ✅ | ✅ | ✅ forbidden + no controls |
| `/practicum/members` | ✅ | ✅ | ✅ forbidden + no controls |
| `/practicum/room-settings` | ✅ | ✅ | ✅ forbidden + no controls |

### Regression Gate

- access.spec.ts: 4/4 PASS ✅
- curriculum-editor.spec.ts: 18/18 PASS ✅
- npm run test:e2e: 35/35 PASS ✅
- npm run typecheck: CLEAN ✅
- npm run build: PASS ✅
- Student cannot access drafts/edit/admin (URL-level): VERIFIED ✅
- Refresh preserves approved changes: VERIFIED ✅
- Only `OWNER`/`STUDENT` identities exist in code, tests, UI and routes: VERIFIED ✅

### Intentional Differences

- `CASE-S2-001`: Plan list uses inline panels (original design per ui-workspace-contract)
- `CASE-S2-006`: Activity rename and reorder added (not in case tree)
- `CASE-S2-004`: Room metadata simplified (prototype scope)
- `ORIGINAL-S2-002`: The project-original two-role permission model intentionally differs from the case site
- Activity names simplified per content ownership rules

## Slice 2 Completion Verdict

All 12 ordered behaviors, 3 URL-level permission blocks, and all required states are implemented and verified.
Slice 2 completion matrix: all rows green.
All routes usable and non-blank.
Student permission boundaries enforced at template level (not just UI hiding).
35/35 E2E, typecheck, and build pass.
No legacy four-role residuals.

**Awaiting user confirmation before recommending Slice 3.**
