# Practicum Nuxt UI Baseline Implementation Plan

> **For agentic workers:** Execute one BDD/TDD behavior at a time and keep the full practicum regression green.

**Goal:** Establish the approved role-workspace design as the permanent Nuxt UI baseline.

**Architecture:** Centralize shell and visual rules in shared components and global CSS. Keep role-specific composition in `/practicum` and identity composition in `/practicum/profile`, while preserving current store actions and routes.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, CSS custom properties, Playwright with Microsoft Edge.

## Global Constraints

- Work only in `C:\Users\29053\Desktop\智能体\数字商贸实训工作台`.
- Never modify `C:\Users\29053\Desktop\szmy2`.
- Keep the practicum on port 4174 and Playwright on `channel: 'msedge'`.
- Add no new dependency.
- Do not implement Slice 3-6 domain behavior.

### Task 1: Visual Contract Regression

**Files:**
- Modify: `tests/e2e/practicum/shell.spec.ts`

- [ ] Create one skipped Gherkin skeleton for the approved shell and role-home composition.
- [ ] Run the BDD skeleton self-check.
- [ ] Convert the skeleton to geometry and composition assertions.
- [ ] Run the focused test and record RED against the skeletal UI.

### Task 2: Shared Workspace Foundation

**Files:**
- Modify: `assets/css/main.css`
- Modify: `components/practicum/PracticumShell.vue`
- Modify: `components/practicum/PracticumSidebar.vue`
- Modify: `components/practicum/PracticumTopbar.vue`

- [ ] Implement the shared tokens, shell geometry, navigation, focus states and responsive breakpoints.
- [ ] Keep future entries disabled and labelled `待开放`.
- [ ] Run the focused shell test until GREEN.

### Task 3: Role Workspaces And Personal Page

**Files:**
- Modify: `pages/practicum/index.vue`
- Modify: `pages/practicum/profile.vue`
- Modify: `pages/practicum/plans/[planId].vue`

- [ ] Recompose all four role homes with existing data and shared patterns.
- [ ] Preserve current create-plan, create-module and create-unit behavior.
- [ ] Recompose Personal with account band and identity cards.
- [ ] Keep plan detail inside the shared shell.

### Task 4: Verification And Future Guardrails

**Files:**
- Create: `docs/ui-development-contract.md`

- [ ] Document mandatory shared components, tokens and visual verification for future Claude work.
- [ ] Run typecheck, full practicum Edge E2E and production build.
- [ ] Capture 1440px and 375px screenshots.
- [ ] Check overflow, target sizes, console errors and visible technical copy.

