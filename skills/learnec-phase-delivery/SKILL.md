---
name: learnec-phase-delivery
description: Enforce the LearnEC higher-education ecommerce practicum delivery rules. Use when working on LearnEC, the digital-commerce practicum project, phases A-E, work-order teaching flows, ADMIN/STUDENT authentication, student sandbox work, reviews, or phase acceptance. Requires reading the project v2.0 architecture, preserving the approved frontend baseline, staying within the approved phase, validating the work, and committing each accepted phase locally.
---

# LearnEC Phase Delivery

## Required Reference

Before inspecting, planning, editing, testing, or reviewing LearnEC work, read [the complete v2.0 architecture](../../docs/learnec/architecture-v2.0.md). Treat it as the source of truth for routes, menus, Prisma models, phase boundaries, and acceptance criteria.

## Delivery Rules

1. Identify the approved phase. Implement only that phase. Do not add, enable, or represent later-phase business capabilities as complete without explicit user approval.
2. Use Prisma/PostgreSQL as the fact source for authentication, tasks, sandbox evidence, submissions, grades, and account management. Do not replace business persistence with `localStorage`, mock state, or JSON files.
3. Keep only `ADMIN` and `STUDENT` in new LearnEC authorization design. Enforce protected API access on the server; route guards and hidden menus are not authorization.
4. Preserve existing frontend appearance, layout, navigation, global CSS, and component styling unless the user explicitly identifies a page and a UI change. Build only the frontend pages explicitly required by the active phase. Treat visual restoration as a separately approved UI task.
5. Before modifying files, run `git status --short` and inspect nearby implementation patterns. Preserve unrelated user changes.

## Phase Gate

Before declaring a phase ready for acceptance:

1. Run the active phase's relevant Playwright or E2E business-path tests.
2. Run `npm.cmd run typecheck`.
3. Run `npm.cmd run build`.
4. Start or verify the local service on port `4310` and check the relevant entry route.
5. Record commands, results, residual risks, and the exact acceptance scope in `docs/acceptance-test-report.md`.

## Local Git Commit

After every accepted phase gate:

1. Stage only verified files belonging to that phase. Never include unrelated dirty files.
2. Run `git diff --cached --check` and inspect the staged diff.
3. Commit locally using `phase-<LETTER>: <concise scope>`, for example `phase-A: auth roles and application shells`.
4. Record the commit hash and phase label in the acceptance report and final handoff.

If unrelated changes prevent a truthful phase-only commit, stop before committing and ask the user how to separate the work. Do not reset, revert, or overwrite existing worktree changes.
