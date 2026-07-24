# practicum-slice-7-commerce-cases-polish parity audit - 2026-07-22 17:10 CST

Skill: practicum-slice-7-commerce-cases-polish
Local checks: green
Case session: not-applicable (ORIGINAL teaching cases and workspace polish)
OpenCLI doctor: not-applicable
Browser: Microsoft Edge

| Feature ID | Class | Role | Project path | Result | Difference/evidence |
|---|---|---|---|---|---|
| ORIGINAL-S7-001 | ORIGINAL | OWNER/STUDENT | `/practicum/cases`, `/practicum/cases/:caseId`, sidebar navigation | not-applicable | Six original anonymous commerce cases; three submittable case exercises reuse local practice submission versions; OWNER guidance/rubric/overview hidden from STUDENT; route-driven nav active state uses `aria-current`; STUDENT sidebar hides admin-only entries; direct URL guards remain active |

## Focused local evidence

- `commerce-cases.spec.ts`: 5/5 passed
- `navigation-permissions.spec.ts`: 4/4 passed
- `slice-7-release-polish.spec.ts`: 1/1 passed
- Focused Slice 7 total: 10/10 passed
- `#app-manifest`: reproduced before fix; fixed by `experimental.appManifest: false` in `nuxt.config.ts`; focused RED/GREEN runs proceeded without the pre-transform error.

## Scope notes

- Cases are marked `ORIGINAL-S7-001` and do not claim source-site parity.
- No external API, database, real upload, copied course asset, real order data, account data or private platform endpoint is used.
- Only `OWNER` and `STUDENT` roles are implemented.

## Final audit

- Full practicum E2E: `npx.cmd playwright test tests/e2e/practicum --reporter=list` -> 100/100 passed on 2026-07-23.
- Typecheck: `npm.cmd run typecheck` -> passed.
- Production build: `npm.cmd run build` -> passed; Nitro output size 2.43 MB.
- HTTP 200: temporary local dev server responded `200` for `http://127.0.0.1:4174/practicum`.
- Four-viewport visual/responsive coverage: `navigation-permissions.spec.ts` includes `/practicum/cases` and one detail route at 375, 768, 1024 and 1440 with no horizontal overflow.
- Isolation/security scan: implementation files have no credential/private API hits; matches are documentation notes and negative test assertions.
