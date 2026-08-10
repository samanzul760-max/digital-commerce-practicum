# LearnEC Phase E Placeholder and Visual Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the final LearnEC placeholder, legacy compatibility, and prototype-quality visual integration without altering accepted phase A-D server behavior.

**Architecture:** The new LearnEC route tree uses a shared header shell, an isolated global Phase E stylesheet, Lucide Vue icons, and existing server responses. A presentation-only capability registry drives standard `COMING_SOON` pages; client middleware maps legacy routes after the existing session has loaded.

**Tech Stack:** Nuxt 3, Vue 3 Composition API, TypeScript, Lucide Vue Next, Playwright.

## Global Constraints

- Do not modify Prisma, migrations, server-side business APIs, authorization helpers, review scoring, submission persistence, or sandbox evidence persistence.
- Use existing `/api/center/assignments`, `/api/admin/tasks`, `/api/admin/classes`, and `/api/admin/data` responses. Do not call a non-existent overview API.
- Keep `ADMIN` and `STUDENT` route guards intact; legacy redirects are client navigation only.
- Do not use browser storage, JSON fixtures, or computed literals as a source of task, submission, grade, or permission facts.
- Do not stage unrelated user changes. `package.json` has a user-owned script hunk; stage only the Lucide dependency hunk.
- Verify 390px viewport widths and full regression before the Phase E implementation commit.

### Task 1: Define Phase E Browser Contracts

**Files:**
- Create: `docs/bdd/phase-e-placeholder-ui.feature.md`
- Create: `tests/e2e/practicum/phase-e-placeholder-ui.spec.ts`

**Interfaces:**
- Consumes: authenticated `/api/auth/login`, existing `/admin` and `/center` route guards.
- Produces: externally observable contract for visual shell, placeholder honesty, legacy redirects, and 390px layout.

- [x] **Step 1: Write failing BDD and Playwright coverage**

```ts
test('legacy routes map by authenticated role and unavailable modules remain honest', async ({ page }) => {
  await login(page, 'ADMIN')
  await page.goto('/practicum/competitions')
  await expect(page).toHaveURL('/admin/competitions')
  await expect(page.locator('[data-capability-placeholder]')).toBeVisible()
  await expect(page.getByText('COMING_SOON')).toBeVisible()
  await expect(page.locator('[data-capability-placeholder] button[type="submit"]')).toHaveCount(0)
})
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-e-placeholder-ui.spec.ts`

Expected: FAIL because the Phase E selectors, nested placeholder pages, and legacy route mapping do not exist.

- [x] **Step 3: Extend the same test file with dashboard, role, navigation, and overflow assertions**

```ts
for (const route of ['/center', '/admin', '/admin/competitions', `/center/tasks/${studentTaskId}/sandbox`]) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(route)
  expect(await page.locator('html').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1)
}
```

- [x] **Step 4: Keep the test red until the corresponding implementation tasks exist**

Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-e-placeholder-ui.spec.ts`

Expected: the same Phase E assertions fail; no existing Phase C/D selector is removed.

### Task 2: Add the Isolated LearnEC Visual Foundation

**Files:**
- Create: `assets/css/learnec-phase-e.css`
- Modify: `app.vue`
- Modify: `package.json` (Lucide dependency hunk only)
- Modify: `package-lock.json`
- Modify: `components/learnec/AppShell.vue`

**Interfaces:**
- Consumes: `useAuthSession().state.value.user`, Vue Router route path, `lucide-vue-next` icon components.
- Produces: `LearnecAppShell` with `[data-learnec-shell]`, `[data-learnec-top]`, and stable role navigation links.

- [x] **Step 1: Add the minimal global visual layer**

```css
:root { --blue:#147bd1; --ink:#17222e; --muted:#697786; --line:#e9edf0; --bg:#f4f7f8; --soft:#edf7ff; --orange:#ff9d45; --purple:#8671e6; --green:#35ad87; }
html, body, #__nuxt { min-width:320px; min-height:100%; }
body { overflow-x:clip; font-family:"Noto Sans SC", "Microsoft YaHei", sans-serif; }
```

- [x] **Step 2: Install Lucide and import the stylesheet through the clean app entry**

```vue
<template><NuxtPage /></template>
<style src="~/assets/css/learnec-phase-e.css"></style>
```

- [x] **Step 3: Rebuild the shell with actual menu routes and no business mutation**

```vue
<NuxtLink v-for="item in menu" :key="item.key" :to="item.to" :class="{ active: isActive(item) }">
  <component :is="item.icon" aria-hidden="true" />
  <span>{{ item.label }}</span>
</NuxtLink>
```

- [x] **Step 4: Run the focused E2E contract and verify GREEN for header render/navigation**

Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-e-placeholder-ui.spec.ts`

Expected: shell selectors and role menus pass; placeholder route assertions may remain red until Task 4.

### Task 3: Rebuild Dashboards and Sandbox From Existing Facts

**Files:**
- Modify: `pages/center/index.vue`
- Modify: `pages/admin/index.vue`
- Modify: `pages/center/tasks/[studentTaskId]/sandbox.vue`
- Modify: `components/center/TaskGuidePanel.vue`
- Modify: `components/center/SandboxWorkbench.vue`

**Interfaces:**
- Consumes: `/api/center/assignments`, `/api/admin/tasks`, `/api/admin/classes`, `/api/admin/data`, existing sandbox props/events.
- Produces: `[data-center-dashboard]`, `[data-admin-dashboard]`, and the unchanged Phase C `data-sandbox-*` controls in prototype layouts.

- [x] **Step 1: Implement student metrics from returned assignment rows**

```ts
const assignments = computed(() => assignmentsResponse.value?.assignments ?? [])
const completed = computed(() => assignments.value.filter(item => item.status === 'GRADED').length)
const completionRate = computed(() => assignments.value.length ? Math.round(completed.value / assignments.value.length * 100) : 0)
const calendarDays = computed(() => assignments.value.filter(item => item.dueAt).map(item => new Date(item.dueAt!)))
```

- [x] **Step 2: Implement admin metrics with an honest class-empty state**

```ts
const selectedClassId = ref('')
const { data: learningData } = await useFetch(() => selectedClassId.value ? `/api/admin/data?classId=${encodeURIComponent(selectedClassId.value)}` : null)
const gradedCount = computed(() => learningData.value?.overview?.gradedCount ?? 0)
```

- [x] **Step 3: Apply `.hero`, `.dash-welcome`, `.paper`, `.calendar`, `.learning`, `.outline`, and `.lesson-card` classes while retaining existing events**

```vue
<CenterSandboxWorkbench :sections="sandboxSections" :student-task-id="taskId" :state="sessionState" :saving="saving" @save="saveDraft" />
```

- [x] **Step 4: Run Phase C and Phase E focused tests**

Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-c-student-sandbox.spec.ts tests/e2e/practicum/phase-e-placeholder-ui.spec.ts`

Expected: PASS, proving visual changes retain draft/save/submit behavior and dashboard facts are loaded from existing APIs.

### Task 4: Implement Standard Capability Placeholders

**Files:**
- Create: `components/platform/CapabilityPlaceholder.vue`
- Create: `pages/admin/competitions/index.vue`
- Create: `pages/admin/competitions/question-banks.vue`
- Create: `pages/admin/competitions/groups.vue`
- Create: `pages/admin/competitions/results.vue`
- Create: `pages/center/practicum/index.vue`
- Create: `pages/center/practicum/[capability].vue`
- Modify: `pages/admin/training-centers.vue`

**Interfaces:**
- Consumes: `title`, `description`, `plannedCapabilities`, `availableHref`, and `status` props.
- Produces: `[data-capability-placeholder]` with `COMING_SOON`, real navigation-only actions, and no mutation controls.

- [x] **Step 1: Create the presentation-only component**

```vue
<section data-capability-placeholder class="capability-placeholder">
  <span class="capability-status">COMING_SOON</span>
  <h1>{{ title }}</h1>
  <p>{{ description }}</p>
  <ul><li v-for="item in plannedCapabilities" :key="item">{{ item }}</li></ul>
  <NuxtLink :to="availableHref">返回可用工作区</NuxtLink>
</section>
```

- [x] **Step 2: Route each unavailable capability to the component with static truthful descriptions**

```ts
const entries = {
  'question-banks': { title: '赛题与题库', plannedCapabilities: ['题目维护', '试卷组卷', '考试安排'] },
  groups: { title: '报名与分组', plannedCapabilities: ['报名审核', '个人与团队分组'] },
  results: { title: '成绩发布', plannedCapabilities: ['成绩核验', '结果发布'] },
}
```

- [x] **Step 3: Update the focused E2E contract to GREEN**

Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-e-placeholder-ui.spec.ts`

Expected: PASS for standard placeholder status, no fake records, and no mutation controls.

### Task 5: Map Legacy Routes Without Weakening Guards

**Files:**
- Modify: `middleware/practicum-auth.global.ts`
- Modify: `components/learnec/AppShell.vue`
- Modify: `tests/e2e/practicum/phase-e-placeholder-ui.spec.ts`

**Interfaces:**
- Consumes: current authenticated user role and `to.path`.
- Produces: role-aware `navigateTo(target)` redirect for every `/practicum/**` URL.

- [x] **Step 1: Add a pure local resolver in the middleware**

```ts
function legacyDestination(path: string, role: 'ADMIN' | 'STUDENT') {
  if (path.startsWith('/practicum/reviews')) return role === 'ADMIN' ? '/admin/reviews' : '/center'
  if (path.startsWith('/practicum/competitions')) return role === 'ADMIN' ? '/admin/competitions' : '/center'
  if (path.startsWith('/practicum/tasks')) return role === 'ADMIN' ? '/admin/tasks' : '/center/assignments'
  if (path.startsWith('/practicum/progress') || path.startsWith('/practicum/data')) return role === 'ADMIN' ? '/admin/data' : '/center/data'
  return role === 'ADMIN' ? '/admin?migrated=practicum' : '/center?migrated=practicum'
}
```

- [x] **Step 2: Render the non-persistent migration notice only when the query marker exists**

```vue
<p v-if="route.query.migrated === 'practicum'" data-legacy-migration-notice>已迁移至 LearnEC 新工作区。</p>
```

- [x] **Step 3: Run the complete Phase E contract**

Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-e-placeholder-ui.spec.ts`

Expected: PASS for authenticated role mappings, unauthenticated login redirect, direct route guard preservation, and no dead shell links.

### Task 6: Full Quality Gate, Evidence, and Phase Commit

**Files:**
- Modify: `docs/acceptance-test-report.md` (Phase E section only)
- Modify: `docs/superpowers/plans/2026-08-10-learnec-phase-e-placeholder-ui.md` (checklist outcomes only)

- [x] **Step 1: Run focused regression tests**

Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-c-student-sandbox.spec.ts tests/e2e/practicum/phase-d-review-data.spec.ts tests/e2e/practicum/phase-e-placeholder-ui.spec.ts`

Expected: PASS.

- [x] **Step 2: Run the full Playwright suite** (executed; historical route assertions and the runner timeout are recorded in the acceptance report)

Run: `npm.cmd run test:e2e:isolated -- tests/e2e`

Expected: all tests pass; report any pre-existing legacy test incompatibility exactly rather than concealing it.

- [x] **Step 3: Run static checks and production build**

Run: `npm.cmd run typecheck`

Expected: exit code 0.

Run: `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`

Expected: exit code 0.

- [x] **Step 4: Start port 4310 and verify representative routes**

Run: `npm.cmd run start`

Expected: `http://127.0.0.1:4310/center`, `/admin`, `/admin/competitions`, and a legacy `/practicum/competitions` response are reachable with the expected redirect/session behavior.

- [x] **Step 5: Record evidence and make the phase-only commit**

```powershell
git add -- assets/css/learnec-phase-e.css app.vue components/learnec/AppShell.vue components/platform/CapabilityPlaceholder.vue pages/center pages/admin middleware/practicum-auth.global.ts tests/e2e/practicum/phase-e-placeholder-ui.spec.ts docs/bdd/phase-e-placeholder-ui.feature.md docs/acceptance-test-report.md docs/superpowers/plans/2026-08-10-learnec-phase-e-placeholder-ui.md package-lock.json
git add -p package.json
git diff --cached --check
git diff --cached --stat
git commit -m "phase-E: placeholder compatibility and visual closure"
```

Expected: only Phase E implementation files are staged; no pre-existing user changes are included.

## Plan Self-Review

- Spec coverage: Task 2 supplies tokens, font, icons, and shell. Task 3 supplies student, admin, and sandbox visual integration from actual APIs. Task 4 supplies all Phase E placeholders. Task 5 supplies legacy migration. Task 6 supplies the requested full verification, service startup, evidence, and isolated Phase E commit.
- Scope: no task changes Prisma, a server handler, server authorization, or existing `/practicum` page components.
- Test order: Task 1 is explicitly red before production UI changes; Tasks 2-5 turn contract slices green; Task 6 performs the broad regression gates.
