# UI Development Contract

## Extend, Do Not Replace

All later Slice pages use the existing workspace shell. A feature may add content, state and actions, but it must not introduce another navigation system, top bar, palette, type scale, radius scale or breakpoint scheme.

## Shared Ownership

| Concern | Owner |
|---|---|
| Workspace frame and live region | `components/practicum/PracticumShell.vue` |
| Navigation inventory and future entries | `components/practicum/PracticumSidebar.vue` |
| Context, notification and Personal | `components/practicum/PracticumTopbar.vue` |
| Tokens and reusable UI patterns | `assets/css/main.css` |
| Role home composition | `pages/practicum/index.vue` |
| Identity selection | `pages/practicum/profile.vue` |

## Required Workflow

1. Read the master Skill, the owning Slice Skill and `practicum-ui-baseline`.
2. Add one BDD skeleton and pass its automatic self-check.
3. Prove RED with a user-observable assertion.
4. Add the smallest behavior inside the shared foundation.
5. Run focused E2E, all practicum E2E, typecheck and build.
6. Capture Edge screenshots at 1440px and 375px; add 768px and 1024px for material layout changes.
7. Reject the change on overflow, overlap, browser-default controls, missing focus, targets below 44px, technical copy or a duplicated shell.

## Current Visual Evidence

- `test-results/ui-baseline-student-desktop.png`
- `test-results/ui-baseline-student-mobile.png`

These images document the implemented baseline. The user-owned expected HTML remains the composition reference; it is not a runtime dependency.

