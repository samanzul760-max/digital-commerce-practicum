# Digital Commerce Practicum Nuxt UI Baseline Design

## Goal

Migrate the approved `数字商贸实训工作台-预期界面.html` visual system into the Nuxt application without replacing current domain behavior or implementing later Slice workflows.

## Source Of Truth

1. `building-digital-commerce-practicum/references/ui-workspace-contract.md` controls current interaction and accessibility rules.
2. `C:\Users\29053\Desktop\数字商贸实训工作台-预期界面.html` controls the approved composition, spacing and visual hierarchy.
3. Existing Nuxt store, seed data and routes control actual behavior.

When the preview conflicts with the current UI contract, the UI contract wins. In particular, identity switching stays on `/practicum/profile`, and visible technical Slice labels are replaced with `待开放`.

## Architecture

- `PracticumShell.vue` owns the stable workspace frame, skip link, sidebar, top bar, live region and main landmark.
- `PracticumSidebar.vue` owns the complete navigation inventory and disabled future entries. Pages do not provide their own navigation markup.
- `PracticumTopbar.vue` owns the context title, notification control and single Personal entry.
- `assets/css/main.css` owns reusable tokens and shared page patterns. Pages may add only narrowly scoped layout rules when a shared pattern is not appropriate.
- Role pages consume the existing store and seed data. They do not fabricate submissions, grades or other later-Slice domain state.

## Role Homes

- Student: published-plan summary, zero-state progress, first available activity, six-module route and honest disabled supporting areas.
- Owner: plan inventory, current create-plan behavior, review authority and administration areas.
- Student: published-plan summary, learning progress, submissions and feedback.

## Extension Contract

Future work must:

- reuse `PracticumShell`, `PracticumSidebar`, `PracticumTopbar` and global tokens;
- add routes inside the existing content region;
- use shared button, form, status, list, table and panel classes before adding page-specific CSS;
- preserve the 244px desktop sidebar, 72px top bar and responsive breakpoints;
- keep identity switching only on `/practicum/profile`;
- add visual regression assertions when materially changing the shell or page composition.

## Acceptance

- Desktop and mobile render the approved hierarchy without horizontal overflow.
- Sidebar navigation, context title, notification and Personal entry are visually complete.
- Student and Owner homes remain distinct inside one shell.
- Existing Slice 1 and partial Slice 2 behavior remains reachable.
- No technical Slice copy, source branding, source assets or external runtime dependency is introduced.
