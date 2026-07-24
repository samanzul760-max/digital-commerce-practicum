# Digital Commerce Practicum Instructions

Work only in this project. Never modify `C:\Users\29053\Desktop\szmy2`.

Before any project change, read:

1. `C:\Users\29053\Desktop\智能体\.claude\skills\building-digital-commerce-practicum\SKILL.md` and every mandatory reference it lists.
2. Exactly one owning `practicum-slice-*` Skill.
3. `C:\Users\29053\Desktop\智能体\.claude\skills\practicum-ui-baseline\SKILL.md` whenever a visible route, Vue component, form, navigation, CSS, responsive layout or interface copy changes.

## Permanent UI foundation

- Preserve `PracticumShell.vue`, `PracticumSidebar.vue`, `PracticumTopbar.vue` and the tokens in `assets/css/main.css`.
- Extend pages inside the existing shell. Do not recreate sidebar or top-bar markup in a page.
- Reuse shared button, form, status, list, table, panel and responsive classes before adding scoped CSS.
- Keep identity switching only on `/practicum/profile`.
- Keep unavailable features disabled and labelled `待开放`; never show technical Slice labels.
- Treat `C:\Users\29053\Desktop\数字商贸实训工作台-预期界面.html` as the approved composition reference and the current `ui-workspace-contract.md` as the interaction authority.
- Do not copy the case website's UI, branding, assets, wording or private interfaces.

Every material UI change requires a BDD/TDD behavior, focused and full Edge E2E, typecheck, build, 1440px and 375px screenshots, zero horizontal overflow and no console errors or warnings.

