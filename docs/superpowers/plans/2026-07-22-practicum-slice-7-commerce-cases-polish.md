# Practicum Slice 7 Commerce Cases Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add original commerce teaching cases, route-driven navigation highlighting, student menu cleanup, Slice 6 release evidence cleanup, and a reusable Slice 7 Skill.

**Architecture:** Reuse the existing Nuxt 3 shell, `usePracticumStore` persistence, and practice-submission contract. Keep the feature local and deterministic: case content lives in TypeScript seed data, submittable cases map to stable local activity/node IDs, and role differences are rendered at the page boundary.

**Tech Stack:** Nuxt 3.21.8, Vue 3.5 Composition API, TypeScript, Playwright Edge E2E, project-local `.claude/skills`.

---

## File Structure

- Create `data/practicum/commerce-case-seed.ts`: typed original case content, three submittable case mappings, self-check items, owner guidance, rubric.
- Modify `domain/practicum/types.ts`: add lightweight `CommerceTeachingCase` types.
- Modify `composables/usePracticumStore.ts`: seed hidden case activities/nodes only for the three submittable cases; expose `getCommerceCaseActivityNodeId`, `saveCaseDraft`, and `submitCaseWork`.
- Create `pages/practicum/cases/index.vue`: shared shell case list for OWNER/STUDENT.
- Create `pages/practicum/cases/[caseId].vue`: role-aware case detail, self-check, draft/submission states, missing state, owner guidance.
- Modify `components/practicum/PracticumSidebar.vue`: route-driven active state, `aria-current="page"`, add teaching cases link, hide admin entries for STUDENT.
- Modify `composables/usePracticumStore.ts`: include case routes in notification/access allowlist behavior where needed.
- Modify docs: `docs/practicum-bdd-catalogue.md`, `docs/feature-completion-matrix.md`, `docs/parity/practicum-slice-6-quality-release.md`, `docs/parity/practicum-slice-7-commerce-cases-polish.md`, `docs/parity/building-digital-commerce-practicum.md`.
- Modify master Skill `C:\Users\29053\Desktop\智能体\.claude\skills\building-digital-commerce-practicum\SKILL.md`: add Slice 7 routing and seven-slice gate wording.
- Create Skill `C:\Users\29053\Desktop\智能体\.claude\skills\practicum-slice-7-commerce-cases-polish\SKILL.md`.
- Add tests:
  - `tests/e2e/practicum/commerce-cases.spec.ts`
  - `tests/e2e/practicum/navigation-permissions.spec.ts`
  - `tests/e2e/practicum/slice-7-release-polish.spec.ts`

## Task 1: BDD Skeletons

**Files:**
- Create: `tests/e2e/practicum/commerce-cases.spec.ts`
- Create: `tests/e2e/practicum/navigation-permissions.spec.ts`
- Create: `tests/e2e/practicum/slice-7-release-polish.spec.ts`
- Modify: `docs/practicum-bdd-catalogue.md`

- [ ] **Step 1: Add BDD-only skipped skeletons**

Create one skipped empty test per Slice 7 behavior. Each test uses `ORIGINAL-S7-001`, only one Given/When/Then block, no locators, no assertions, and no product imports.

- [ ] **Step 2: Self-check skeletons**

Run:

```powershell
rg -n "test\.skip|ORIGINAL-S7-001|Given|When|Then" tests/e2e/practicum/commerce-cases.spec.ts tests/e2e/practicum/navigation-permissions.spec.ts tests/e2e/practicum/slice-7-release-polish.spec.ts
```

Expected: every skeleton has the legal ID and no `expect(` before RED conversion.

## Task 2: RED Tests For Cases And Navigation

**Files:**
- Modify: `tests/e2e/practicum/commerce-cases.spec.ts`
- Modify: `tests/e2e/practicum/navigation-permissions.spec.ts`
- Modify: `tests/e2e/practicum/slice-7-release-polish.spec.ts`

- [ ] **Step 1: Convert skeletons to real Playwright tests**

Cover:
- six cases visible to OWNER/STUDENT;
- role boundary: student sees task/self-check/submission, owner sees guidance/rubric/overview;
- three submittable cases persist draft, submitted version, returned revision, and graded state where applicable;
- missing case route shows clear missing state;
- route-driven active nav at desktop and mobile;
- student menu hides admin-only routes while direct URL guards still work;
- Slice 6 evidence text is current and no Owner/Teacher residual appears.

- [ ] **Step 2: Run RED**

Run:

```powershell
npx.cmd playwright test tests/e2e/practicum/commerce-cases.spec.ts tests/e2e/practicum/navigation-permissions.spec.ts tests/e2e/practicum/slice-7-release-polish.spec.ts --reporter=list
```

Expected: fail because `/practicum/cases` and route-driven active nav do not exist yet.

## Task 3: Implement Case Data And Pages

**Files:**
- Create: `data/practicum/commerce-case-seed.ts`
- Modify: `domain/practicum/types.ts`
- Modify: `composables/usePracticumStore.ts`
- Create: `pages/practicum/cases/index.vue`
- Create: `pages/practicum/cases/[caseId].vue`

- [ ] **Step 1: Add original deterministic case seed**

Add six `ORIGINAL-S7-001` cases:
1. 商品卖点提炼, submittable.
2. 商品标题与详情页诊断, read-only with self-check.
3. 优惠券组合活动策划, submittable.
4. 订单异常处理, read-only with self-check.
5. 客服差评回复, submittable.
6. 店铺数据周报复盘, read-only with self-check.

- [ ] **Step 2: Wire submittable cases to existing practice submission flow**

Create hidden case activity nodes for `case-selling-points`, `case-coupon-plan`, and `case-review-reply`. Use stable node IDs and `PRACTICE_ACTIVITY` configs so existing draft/version/review/progress mechanics work.

- [ ] **Step 3: Build pages with existing shell and CSS classes**

List page renders case cards. Detail page renders student/owner sections, missing state, draft/submitted/returned/graded status, and no owner guidance for STUDENT.

- [ ] **Step 4: Run focused GREEN**

Run:

```powershell
npx.cmd playwright test tests/e2e/practicum/commerce-cases.spec.ts --reporter=list
```

Expected: pass.

## Task 4: Navigation And Permissions Polish

**Files:**
- Modify: `components/practicum/PracticumSidebar.vue`
- Modify: `assets/css/main.css` only if existing classes cannot express active state.
- Modify: `tests/e2e/practicum/navigation-permissions.spec.ts`

- [ ] **Step 1: Replace hard-coded active class**

Use `useRoute()` and a small local nav array. For each visible nav item, compute active by route prefix and set both `nav-item-active` and `aria-current="page"`.

- [ ] **Step 2: Hide student-inaccessible menu entries**

For STUDENT, render only workspace, teaching plan, teaching cases, learning progress, and notifications. Keep topbar personal entry unchanged. Direct URL forbidden states stay in page components.

- [ ] **Step 3: Run focused GREEN**

Run:

```powershell
npx.cmd playwright test tests/e2e/practicum/navigation-permissions.spec.ts --reporter=list
```

Expected: pass at 375 and desktop widths.

## Task 5: Slice 6 Evidence And Dev Server Investigation

**Files:**
- Modify: `pages/practicum/progress.vue`
- Modify: `docs/parity/practicum-slice-6-quality-release.md`
- Modify: `tests/e2e/practicum/slice-7-release-polish.spec.ts`

- [ ] **Step 1: Remove residual Owner/Teacher wording**

Replace any lingering `Owner/Teacher` comment or visible/doc wording in Slice 6-owned code with OWNER/管理员.

- [ ] **Step 2: Update Slice 6 parity evidence**

Correct focused and full E2E counts to current verified values after the final run. Record `#app-manifest` investigation truthfully.

- [ ] **Step 3: Reproduce dev server log issue**

Run the Playwright server-backed focused tests and inspect output. If `#app-manifest` appears, record the exact evidence and mark blocked if root cause is upstream. If it does not appear after clean `.nuxt`, record clean evidence.

## Task 6: Slice 7 Skill And Project Docs

**Files:**
- Create: `C:\Users\29053\Desktop\智能体\.claude\skills\practicum-slice-7-commerce-cases-polish\SKILL.md`
- Modify: `C:\Users\29053\Desktop\智能体\.claude\skills\building-digital-commerce-practicum\SKILL.md`
- Modify: `docs/feature-completion-matrix.md`
- Modify: `docs/practicum-bdd-catalogue.md`
- Create: `docs/parity/practicum-slice-7-commerce-cases-polish.md`
- Modify: `docs/parity/building-digital-commerce-practicum.md`

- [ ] **Step 1: Initialize and write the Skill**

Use Skill Creator guidance. The Skill must require parent `building-digital-commerce-practicum`, UI baseline, TDD/BDD, `ORIGINAL-S7-001`, OWNER/STUDENT only, S7-01 to S7-12 order, and final automation.

- [ ] **Step 2: Validate Skill**

Run the available validation script if present:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\29053\Desktop\智能体\.claude\skills\building-digital-commerce-practicum\scripts\verify-skill-exit.ps1" -SkillName "practicum-slice-7-commerce-cases-polish" -FocusedSpec "tests/e2e/practicum/commerce-cases.spec.ts" -ParityReport "C:\Users\29053\Desktop\智能体\数字商贸实训工作台\docs\parity\practicum-slice-7-commerce-cases-polish.md"
```

Expected: pass or report only a documented upstream/source-session limitation.

## Task 7: Full Verification

**Files:**
- No new files unless evidence screenshots are produced under `output/playwright/`.

- [ ] **Step 1: Run quality gates**

```powershell
npm.cmd run typecheck
npx.cmd playwright test tests/e2e/practicum --reporter=list
npm.cmd run build
```

- [ ] **Step 2: Run HTTP and isolation checks**

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4174/practicum
rg -n "sid=|authorization:|bearer\s|password\s*=|shizhanbao\.cn/api|TEACHER|MENTOR|Owner/Teacher" . --glob "!node_modules/**" --glob "!.nuxt/**" --glob "!.output/**"
```

Expected: HTTP 200; no sensitive or forbidden role matches in implementation.

- [ ] **Step 3: Capture visual evidence**

Run Edge checks at 375, 768, 1024, and 1440 for `/practicum/cases` and one detail route. Expected: no horizontal overflow, active nav visible, no overlapping text.

## Self-Review

- Spec coverage: S7-01 through S7-12 map to Tasks 1-7.
- Placeholder scan: no TBD/TODO/fill-in markers.
- Type consistency: case IDs map to stable node IDs and existing submission state types.
- Ponytail check: no database, no new dependency, no second submission system, no copied external case content.
