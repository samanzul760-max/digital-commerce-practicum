# LearnEC Phase E Placeholder, Compatibility, and Visual Integration Design

## Goal

Complete the final LearnEC delivery phase without changing Prisma, server APIs, authorization, or the accepted phase A-D business paths. The phase provides honest capability placeholders, redirects legacy `/practicum/**` URLs into the role-prefixed application, restores the approved LearnEC prototype visual language for the new routes, and closes the full quality gate.

## Scope and Boundaries

- Change only the new LearnEC shell and routes: `/center`, `/admin`, `/center/tasks/:studentTaskId/sandbox`, public training centers, capability placeholders, client redirect middleware, Phase E tests, and Phase E documentation.
- Do not modify Prisma schema, migrations, server-side business APIs, phase A-D services, role authorization, review scoring, submission persistence, or sandbox evidence persistence.
- Do not modify legacy `/practicum` page components. They remain in the repository for migration compatibility but are no longer the feature surface.
- Do not include current untracked image assets in this commit. The design uses CSS surfaces and Lucide icons so the Phase E commit is self-contained.
- Never create synthetic tasks, submissions, grades, enrollments, permissions, registrations, competition lists, or results. Browser `localStorage` is not used as a business fact source.

## Visual System

Add an isolated Phase E stylesheet loaded after the existing styles. It defines the approved prototype tokens:

```css
--blue: #147bd1;
--ink: #17222e;
--muted: #697786;
--line: #e9edf0;
--bg: #f4f7f8;
--soft: #edf7ff;
--orange: #ff9d45;
--purple: #8671e6;
--green: #35ad87;
```

The stylesheet also defines a restrained white workbench surface, `6px` cards, hairline borders, responsive grids, focus styles, and `overflow-x: clip` at the document boundary. The application imports Noto Sans SC and uses `lucide-vue-next` for navigation, state, metric, and action icons.

## Shared Shell

`LearnecAppShell` becomes the new-route header shell:

- Brand: `✦ LearnEC` with the prototype `.top` and `.logo` treatment.
- Role-specific top navigation uses the prototype selected-tab treatment and Lucide icons.
- The existing server-backed session remains the only source for the account display and logout action.
- Admin navigation includes working center, task management, review center, competition placeholder, and data center. Student navigation includes home, assignments, practicum catalog, and personal data.
- At narrow widths navigation remains horizontally scrollable inside the header while the page itself does not overflow.

## Student Home

`/center` is a server-rendered client-safe dashboard using only `GET /api/center/assignments`.

- A `.hero` section introduces the current learning area and links to the actual assignment center.
- A `.dash-welcome` panel uses the signed-in display name and decorative Lucide award icons.
- Summary cards calculate total assignments, actionable assignments (`AVAILABLE`, `IN_PROGRESS`, `RETURNED`), in-progress count, and completion rate (`GRADED / total`) from the returned `StudentTask` rows.
- `.paper` and `.progress-row` show the most recent real assignment rows and their state-based progress. If the list is empty, the page states that no published work order is available.
- A `.calendar` lists actual deadline dates from task rows. It does not describe a deadline as a submission timestamp and does not invent activity events.

The project does not currently expose `/api/center/overview`; Phase E must not call or fabricate it.

## Admin Home

`/admin` presents a visual dashboard while preserving the existing task and review pages as the sources of action.

- `GET /api/admin/tasks` provides real work-order counts and recent items.
- `GET /api/admin/data?classId=...` is used only after choosing an authorized class. Its actual response populates completion and grade metrics.
- Prototype orange, blue, green, and purple metric surfaces link to real task management, review, and data routes.
- Missing class context and empty metrics use clear empty states rather than static counts.

## Sandbox Visual Integration

`/center/tasks/:studentTaskId/sandbox` retains its existing API calls, task scope, draft persistence, submit operation, and data selectors.

- The page adopts the prototype `.learning` frame: left guide, center workbench, and a compact right-side evidence/status surface.
- The guide uses `.outline` styling with the approved `#e8f4ff` active state.
- Existing sandbox fields, checkboxes, save action, and submit action remain functional and retain their accessible labels/selectors.
- The workbench and evidence areas use the prototype `.lesson-card` border and radius treatment.
- At `840px` and below the content becomes a single readable column; at `390px` the document has no horizontal overflow.

## Capability Placeholders

Create `components/platform/CapabilityPlaceholder.vue` as the single presentational component for unavailable capabilities.

- Status is explicitly `COMING_SOON`.
- It explains the intended capability, the current limitation, and the real routes that are available today.
- Its buttons only navigate to a real page or display a non-mutating unavailable message.
- It includes loading, empty, and forbidden presentation states for consumers that need them.
- It does not send create, registration, grouping, publication, scoring, or result requests.

Phase E consumers are:

| Route | Capability |
| --- | --- |
| `/admin/competitions` | Competition and examination management |
| `/admin/competitions/question-banks` | Question bank |
| `/admin/competitions/groups` | Registration and grouping |
| `/admin/competitions/results` | Result publication |
| `/admin/training-centers` | Public training center category explanation |
| `/center/practicum/customer-service` | Customer-service training |
| `/center/practicum/cross-border` | Cross-border platform operation |

Existing working Phase B-D routes retain their real pages and are not converted into placeholders.

## Legacy Compatibility

The global route middleware continues to load the server-backed session first. Authenticated legacy paths redirect by role and route intent:

- `/practicum` redirects to `/admin` for `ADMIN`, or `/center` for `STUDENT`.
- Student task/progress routes redirect to `/center/assignments` or `/center/data` for `STUDENT`; an `ADMIN` receives `/admin/tasks` or `/admin/data`.
- Review routes redirect to `/admin/reviews` for `ADMIN`; a `STUDENT` is redirected to `/center` by the existing role guard.
- Competition routes redirect to `/admin/competitions` for `ADMIN`; a `STUDENT` is redirected to `/center`.
- Legacy routes without a direct replacement route redirect to the role home with a URL query migration marker. The destination renders a concise notice and remains usable without the marker.
- Unauthenticated legacy URLs redirect to `/login`.

The middleware changes front-end navigation only; it does not weaken server authorization or alter old API behavior.

## Test and Quality Contract

Add focused Playwright coverage for:

- admin and student direct-route authorization;
- legacy path mapping and unauthenticated redirect;
- `COMING_SOON` placeholders that expose no fake records or mutating controls;
- student and admin dashboard rendering from the existing APIs, including honest empty states;
- sandbox save and submit controls after visual integration;
- `390px` document overflow for the shell, dashboards, placeholders, and sandbox;
- no dead shell navigation links.

Before phase acceptance run the full E2E suite, `npm.cmd run typecheck`, `npm.cmd run build`, start port `4310`, and check representative admin and student routes. Record exact results, residual risks, and the final commit in `docs/acceptance-test-report.md`.

## Acceptance Criteria

1. No Phase A-D backend behavior or database contract changes.
2. Every unavailable Phase E capability visibly states `COMING_SOON` and cannot create false business facts.
3. Every `/practicum/**` path has an authenticated role-aware migration destination or returns to the correct role home with a migration notice.
4. New LearnEC routes consistently use the approved tokens, Noto Sans SC, Lucide icons, responsive header, dashboard cards, and sandbox visual system.
5. The displayed counts and task rows come from existing server APIs or render an honest empty state.
6. Full E2E, typecheck, build, and local `4310` route verification pass before the Phase E implementation commit.
