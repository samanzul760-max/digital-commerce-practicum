# 智能体阶段 A 验收报告

## 2026-08-11 LearnEC 阶段 E：视觉融合、占位能力与兼容迁移

验收范围：仅限 LearnEC 新路由壳层、`/center`、`/admin`、学生任务沙盘、标准能力占位页和 `/practicum/**` 兼容重定向。没有修改 Prisma、服务端业务 API、授权实现或阶段 A-D 的持久化逻辑；任务、提交、成绩和权限仍以 Prisma/PostgreSQL 为唯一事实来源。

| 验收项 | 命令或路径 | 结果 |
|---|---|---|
| C/D/E 业务回归 | `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-c-student-sandbox.spec.ts tests/e2e/practicum/phase-d-review-data.spec.ts tests/e2e/practicum/phase-e-placeholder-ui.spec.ts` | PASS，13/13；覆盖学生沙盘、提交/批阅/成绩、角色守卫、旧赛考路由迁移、占位页无写入控件，以及 390px 无横向溢出。 |
| 全量历史 E2E | `npm.cmd run test:e2e:isolated -- tests/e2e` | 未通过：336 个历史用例在第 23 个后触发 runner 内置 180 秒上限；已运行的旧 `/practicum` 页面断言预期保留旧页面，与本阶段已批准的统一迁移至 `/admin`、`/center` 相冲突。未为了让旧断言变绿而取消迁移。 |
| 类型门禁 | `npm.cmd run typecheck` | PASS，退出码 0。 |
| 生产构建 | `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build` | PASS，退出码 0。 |
| 本地服务 | `npm.cmd run start`，`GET http://127.0.0.1:4310/api/auth/session` | PASS，4310 正在监听，未登录请求返回 401，守卫生效。 |

阶段 E 交付：引入 Noto Sans SC、Lucide 图标和隔离的视觉 Token；重构新路由顶栏、学生/管理员仪表盘和三栏沙盘；新增赛考与学生实训能力的 `COMING_SOON` 标准占位页；旧 `/practicum/**` 链接按当前角色迁移到对应新入口。公共实训中心继续使用既有的真实读取页，不伪造培训室或赛考数据。

残余风险：历史全量 E2E 需要在后续迁移专项中重写为新路由兼容契约，并调整 180 秒总时限；该工作不属于阶段 E 的“保留旧路由重定向”范围。本阶段不部署生产环境。阶段 D 已提交 `8a2d55d`（`phase-D: review grading and learning analytics closure`）；阶段 E 提交将记录在本节。

## 2026-08-10 LearnEC 阶段 A 账号管理闭环

- `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-a-v2.spec.ts`: 4/4 通过。覆盖 `admin` 登录、学生访问管理端拒绝、管理端五项固定菜单，以及管理员生成学生账号并重置密码。
- 账号生成接口对留空的临时密码由服务端安全生成，并返回 `201 Created`；账号、会话撤销和审计记录均通过 Prisma/PostgreSQL 写入。
- `npm.cmd run typecheck`: 通过，退出码 `0`。
- `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`: 通过，退出码 `0`。
- 已强制终止本项目 4310/`.output` 相关 Node 进程并清理 `.output`，随后从零重跑上述 E2E、typecheck 与 build，结果保持通过。
- 阶段 A 本地 Git 提交：`6b8c4a818ae26f72d67d615ed452d141568b2db4`（`phase-A: auth roles and application shells`）。
- `node --test tests/runtime/isolated-e2e-fixtures-contract.test.mjs`: 2/3 通过；未通过项是测试仍断言旧的全局初始化班级查询，但当前初始化已改为管理员登录建会话。该过期断言未改动，不作为本阶段账号闭环的通过证据。

## 2026-08-07 Compilation Repair Verification

- `npx.cmd prisma generate`: passed; regenerated the local client without a database migration or database write.
- `npm.cmd run typecheck`: passed in 14.6 s.
- `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`: passed in 36.5 s.
- `npx.cmd playwright test tests/e2e/practicum/three-role-integrated-closure.spec.ts --list`: passed; 3 tests discovered.
- Runtime Playwright scenarios remain `UNVERIFIED`: their current global setup deletes `.data-e2e` and invokes persistent server APIs, which is outside this repair pass's no-data-change boundary.

## 2026-08-07 Isolated E2E Setup

- Added `scripts/run-isolated-e2e.mjs`: each run uses a unique `.artifacts/practicum-e2e/<run-id>/` directory, rejects non-loopback PostgreSQL URLs and shared database names, and uses port `4186` without clearing shared ports.
- Added `tests/runtime/isolated-e2e-contract.test.mjs`: 3/3 passed.
- One runtime attempt, `npm.cmd run test:e2e:isolated`, stopped before browser startup because Docker Compose could not infer a project name from the Chinese workspace directory. The runner now supplies an explicit ASCII project name. The browser flow was not retried under the single-run rule.
- No test database was created and no migration was executed by that failed runtime attempt. Runtime user-flow acceptance remains `UNVERIFIED`.

## 验收范围

本报告覆盖当前已实现切片：阶段 A 基础工作台能力、既有学习与管理原型，以及本次新增的服务端账号认证与 session。测试针对本地环境，不代表多实例生产存储或完整业务 API 已完成。

## 已执行用例

| 用户动作 | 预期结果 | 实际结果 | 状态 | 对应代码 |
|---|---|---|---|---|
| 未选择身份进入工作台 | 显示身份引导，不展示受保护数据 | 阶段 A 测试通过 | PASS | `pages/practicum/index.vue` |
| 选择 OWNER 身份 | 显示管理导航和管理页面入口 | 阶段 A 测试通过 | PASS | `domain/practicum/permissions.ts` |
| 选择 STUDENT 身份 | 显示学习导航，管理页呈现无权限状态 | 阶段 A 测试通过 | PASS | `components/practicum/PracticumSidebar.vue` |
| 学生点击已发布计划 | 进入计划学习入口 | access 测试通过 | PASS | `pages/practicum/index.vue` |
| 学生直接访问管理 URL | 页面显示 forbidden，不执行管理写操作 | navigation/access 测试通过 | PASS | 受保护页面 |
| 连续点击创建计划 | 只产生一次创建动作 | 阶段 A 测试通过 | PASS | `pages/practicum/index.vue` |
| 刷新页面 | localStorage 原型状态保持 | 阶段 A 持久化测试通过 | PASS | `composables/usePracticumStore.ts` |

## 认证与会话验收

| 用户动作 | 预期结果 | 实际结果 | 状态 | 对应代码 |
|---|---|---|---|---|
| 未登录访问工作台 | 跳转到登录页，不展示受保护工作台 | 通过 `auth-session.spec.ts` 验证 | PASS | `middleware/practicum-auth.global.ts` |
| 使用有效项目测试账号登录 | 建立 HttpOnly session 并进入工作台 | 登录、session 查询通过 | PASS | `server/api/auth/login.post.ts` |
| 使用错误密码登录 | 留在登录页并显示通用错误，不泄露账号是否存在 | 通过 | PASS | `pages/practicum/profile.vue` |
| 刷新已登录页面 | session 仍有效，工作台可继续访问 | 通过 | PASS | `server/api/auth/session.get.ts` |
| 退出登录后访问工作台 | session 撤销并回到登录页 | 通过 | PASS | `server/api/auth/logout.post.ts` |

## 验证命令

本次交付必须以当前工作区新鲜输出为准：

```powershell
npm.cmd run typecheck
npm.cmd run build
npx.cmd playwright test tests/e2e/practicum/phase-a-foundation.spec.ts --reporter=list
npx.cmd playwright test tests/e2e/practicum/shell.spec.ts tests/e2e/practicum/access.spec.ts tests/e2e/practicum/navigation-permissions.spec.ts --reporter=list
```

## 未覆盖或仍为风险

- 尚未实现真实账号登录、退出、会话过期和服务端权限校验。
- 尚未实现真实数据库/API、对象存储上传和跨用户数据隔离。
- TEACHER/MENTOR 工作台仍属于待开放角色，不应视为已验收。
- 完整 `tests/e2e/practicum` 已执行：128 个用例全部通过，包含本次 5 个认证会话用例。
- 项目当前没有 `lint` script，因此不能报告 lint 通过。

## 全量 E2E 结果

`tests/e2e/practicum` 共 128 个用例，全部通过，运行耗时约 3.2 分钟。此前发现的学习首页进度摘要、损坏 localStorage 恢复提示和 loading 状态问题仍保持通过。

## 结论规则

## 2026-07-29 CSRF foundation slice

| Scenario | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| `BDD-FOUNDATION-001` missing CSRF token | A logged-in write returns `403 CSRF_INVALID` and changes no data. | RED returned `201`; GREEN returns `403 CSRF_INVALID`. | PASS | `tests/e2e/practicum/plans-api.spec.ts` |
| Valid CSRF token | Authorized writes retain idempotency and version rules. | 21 related API scenarios pass. | PASS | Playwright focused regression |
| First-party client writes | Existing resource, submission, and workspace writes carry the session token. | All current `/api/practicum/*` frontend writes use `useCsrfHeaders`. | PASS | Composables and resource page |

TDD RED: `npx.cmd playwright test tests/e2e/practicum/plans-api.spec.ts --reporter=list` failed because the protected write returned `201`. GREEN: the same suite passed 5/5. Regression: six related API suites passed 21/21.

Browser acceptance: `npx.cmd playwright test tests/e2e/practicum/administration.spec.ts --reporter=list` passed 3/3, including the resource-library write path. The separate existing `auth-session.spec.ts` suite is not counted as passed: after its setup clears cookies, the page shows first-owner bootstrap while those tests expect a login form. This is a pre-existing bootstrap/seed-account test-state mismatch, not a CSRF failure.

Plan withdrawal TDD: `BDD-PLAN-018` first failed with `404` because `/withdraw` did not exist; after adding the `PUBLISHED -> DRAFT` state transition, `plans-api.spec.ts` passed 6/6. The plan-editor page remains local-store based, so this proves the API contract only, not the complete plan UI workflow.

Custom activity TDD: `BDD-CURRICULUM-003` first failed with `404` because the activities route did not exist. After implementation and an idempotency-order correction, `curriculum-api.spec.ts` passed 4/4. This verifies the server contract only; the editor still creates activities through the local store.

Plan detail server-source TDD: `BDD-PLAN-019` first displayed `计划未找到` for a plan created through the API. After replacing the detail page's local plan lookup with the server snapshot, `plan-server-source.spec.ts` passed 1/1. The page now also writes first- and second-level directories through the server API.

只有命令退出码为 0 且输出明确显示无失败用例，才能将对应行标记为 PASS。任何命令因端口占用、超时、启动失败或浏览器错误结束，都标记为 FAIL/未完成并记录原因。

## 本轮提交审核来源验收

| 用例 | 预期 | 实际 | 状态 | 证据 |
|---|---|---|---|---|
| 服务端空队列 | 不显示 localStorage 残留，显示空态 | 修复后通过，刷新后仍为空态 | PASS | `BDD-SUBMISSION-005`，桌面 Playwright |
| 服务端队列失败 | 显示错误，不渲染残留数据 | 修复后通过 | PASS | `BDD-SUBMISSION-006` |
| 移动端审核队列 | 390px 空态可见且无水平溢出 | 通过 | PASS | `submission-server-source.spec.ts` |

本轮切片结论：`PARTIAL`。审核队列来源约束已验证，但学生草稿、活动进度和提交详情仍有 store 兼容路径，不能将整个提交模块标记为 PASS。

## 本轮管理员开通与登录验收

| 用户动作 | 预期结果 | 实际结果 | 状态 | 证据 |
|---|---|---|---|---|
| 首次管理员开通 | 只保存摘要，建立 HttpOnly 会话并进入工作台 | Playwright 创建运行时测试账号，刷新后仍为认证状态 | PASS | `BDD-AUTH-006`、`auth-bootstrap.spec.ts` |
| 重复开通 | 不再展示表单，接口稳定拒绝 | 登录表单可见，API 返回 `409 BOOTSTRAP_ALREADY_COMPLETED` | PASS | `BDD-AUTH-007`、`auth-bootstrap.spec.ts` |
| 未登录直达工作台 | 跳转独立登录页，不展示业务数据 | 跳转 `/practicum/login` | PASS | `BDD-AUTH-008`、`auth-bootstrap.spec.ts` |
| 账号登录、错误、刷新、退出 | 会话正确建立、恢复与撤销 | 5 个既有认证场景全部通过 | PASS | `auth-session.spec.ts` |
| 移动端登录 | 390px 可访问且无水平溢出 | 通过 | PASS | `auth-bootstrap.spec.ts` |

TDD 证据：`npx.cmd playwright test tests/e2e/practicum/auth-bootstrap.spec.ts --reporter=list` 在实现前为 2 failed/1 passed（缺少开通表单和独立登录路由）；实现后与 `auth-session.spec.ts` 合计 8 passed。

本轮质量门：`npm.cmd run typecheck` PASS；`NUXT_IGNORE_LOCK=1 npm.cmd run build` PASS；`lint` 未配置。生产部署、远程 PM2 与健康检查尚未执行，整体结论仍为 `PARTIAL`。

## 本轮全量回归

## 2026-08-07 Isolated three-role browser verification

`npm.cmd run test:e2e:isolated` was run once for `tests/e2e/practicum/three-role-integrated-closure.spec.ts`. It stopped with exit code `1` after 2.4 seconds, before it could create the isolated test database, apply migrations, start Nuxt on port `4186`, or run a browser case. The runner's Docker Compose command conflicts with the existing healthy local container name `digital-commerce-practicum-postgres`.

Post-run read-only checks found no `practicum_e2e_*` database and no listeners on ports `3001` or `4186`. The existing PostgreSQL container stayed healthy. The run artifacts remain in `.artifacts/practicum-e2e/run-2026-08-07t05-18-45-480z/`; its Compose-created network and volume were retained rather than deleted. Under the single-run rule, there was no retry. Result: the student, teacher, and administrator integrated browser flows are `UNVERIFIED`.

### Runner repair evidence

The failed command exposed a test-runner defect rather than a business-flow defect. A new contract assertion first failed because `scripts/run-isolated-e2e.mjs` still called Compose and did not verify the existing container state. After the minimal repair, `node --test tests/runtime/isolated-e2e-contract.test.mjs` passed `3/3`, and `node --check scripts/run-isolated-e2e.mjs` passed. The runner now reads the existing container's running state and then uses `pg_isready`; it does not call Compose. No browser test was rerun in this repair step, so the three-role journey remains `UNVERIFIED`.

### Second isolated execution window

The repaired command was run once. It created the isolated local database `practicum_e2e_run_2026_08_07t05_24_32_490z`, applied all 9 migrations, and completed Nuxt's client and server build. It then stopped after the `/practicum` SSR readiness probe timed out at 90 seconds, before Playwright started. The server process released port `4186`; the test database and `.artifacts/practicum-e2e/run-2026-08-07t05-24-32-490z/` evidence remain retained.

A second TDD repair changed the readiness probe to `/api/auth/session`, accepting the expected unauthenticated `401` as proof that Nuxt is responding. The updated runner contract passed `3/3`, and its syntax check passed. The browser flow was not rerun after this repair, so student, teacher, and administrator integrated browser acceptance remains `UNVERIFIED`.

### Dedicated isolation hardening

The later safety review found that the runner still used the shared local PostgreSQL container and lacked deterministic empty-database fixtures. The runner now provisions only a run-labelled dedicated PostgreSQL container, uses a random loopback port, creates the run-matched database before migrations, seeds deterministic organization, room, member, teacher-class, enabled-template, and published-competition records, rejects retry flags, and retains test evidence. The combined runtime and fixture contract suite passes `8/8`; `npm.cmd run typecheck` passes.

One new single browser-validation window was attempted with the dedicated runner. It stopped after 23.5 seconds while Docker attempted to start `postgres:16-alpine`, which is not available in the local image cache; no dedicated container, database, migration, Nuxt server, or Playwright browser case was created. The runner was corrected to use the project image `postgres:17`, and the contracts remain `8/8` passing. The command was not retried under the one-run rule. Student, teacher, and administrator browser acceptance remains `UNVERIFIED`.

`npx.cmd playwright test tests/e2e/practicum --reporter=list` 于 2026-07-28 完成，结果为 145 passed、5 failed，耗时约 4.7 分钟，故全量门禁为 `FAILED`。

- `student-activities-s3-010.spec.ts`：等待瞬时 `[data-loading]` 状态失败。
- `teacher-review.spec.ts` 4 项：审核队列仍依赖旧本地身份预览和数据状态，与服务端权威队列为空的当前契约不一致。

认证开通与登录的 8 项 focused 测试均通过，但因为上述全量回归失败，本轮不能报告生产发布完成，部署状态为 `UNVERIFIED`。

## 本轮未通过或未验证

- 完整 `npx.cmd playwright test tests/e2e/practicum --reporter=list` 在 243 秒后超时并出现 `EPIPE`，记为 `UNVERIFIED/FAILED`，旧报告的 128/128 不能作为本轮证据。
- 相关回归套件 19 个用例中 15 个通过、4 个失败。失败均来自 `teacher-review.spec.ts` 使用 OWNER session 切换“学生视角”后仍把提交写入 localStorage；服务端队列按新契约为空。该身份预览与真实服务端角色尚未统一，提交/审核整体保持 `PARTIAL`。

## 2026-07-30 Member skill map slice

| BDD | RED | GREEN | Result |
|---|---|---|---|
| `SB-D-11`, `SB-D-12` | `npx.cmd playwright test tests/e2e/practicum/analytics-member-skill-map-api.spec.ts --reporter=list` failed because the member detail response had no skill-map fields. After the first implementation, the same test still failed because graded submissions used the authenticated user ID while analytics matched only the prototype member ID. | `npx.cmd playwright test tests/e2e/practicum/analytics-member-skill-map-api.spec.ts tests/e2e/practicum/analytics-member-page.spec.ts --reporter=list` passed 2/2 after adding the server-side membership mapping and skill aggregation. | Owner can grade a real student submission and read skill scores, mastery, strengths, and improvements. Student direct access returns `403 MEMBER_ANALYTICS_FORBIDDEN`. |

This slice is `IMPLEMENTED_UNVERIFIED`, not `PASS`: mobile coverage and the full Playwright suite have not yet been rerun for this change.

Build gate: `NUXT_IGNORE_LOCK=1 npm.cmd run build` compiled the client and server, then failed during Nitro node-externals output tracing with `EPERM: operation not permitted, readlink 'C:\\Users\\29053'`. A direct Node `fs.promises.readlink('C:\\Users\\29053')` reproduced the same `EPERM`; `C:\\Users\\29053` is a normal directory and neither `nuxt.config.ts` nor `package.json` has local changes. This is an environment permission blocker, so the build result is `FAILED` and no completion commit was created.

## 2026-07-30 Access and workspace regression slice

| Scenario | RED | GREEN | Result |
|---|---|---|---|
| `SB-Q-04` student opens a draft plan directly | The real student session received `403 PLAN_FORBIDDEN`, but the page rendered only `data-empty`. | `access.spec.ts` passed 4/4 after rendering the 403 as `data-forbidden`. | No plan data is exposed and the student sees a clear restricted-state message. |
| `SB-Q-01` logout redirects to login | The logout request revoked the cookie but left the browser on `/practicum/profile`. | `context-ui.spec.ts` passed 4/4 after navigating to `/practicum/login`. | Logout is observable through both URL and access boundary. |
| `SB-G-04` mobile workspace context | The teaching-mode field was hidden at 390px. | The mobile context scenario passed after retaining the text and confirming no horizontal overflow. | Organization, room, and teaching mode remain readable. |

Focused regression: `npx.cmd playwright test tests/e2e/practicum/access.spec.ts tests/e2e/practicum/context-ui.spec.ts --reporter=list` passed 8/8. The full suite remains `FAILED/UNVERIFIED`: it timed out after 600 seconds after beginning 183 cases, and many legacy tests still model a student by changing only the client-side preview role while retaining the global OWNER session. Those tests must be migrated to real per-role login contexts; server authorization was not weakened to make them pass.

## 2026-07-30 Real-session regression migration

| Scenario | RED | GREEN | Result |
|---|---|---|---|
| `BDD-AUTH-001` to `BDD-AUTH-005` | The standalone authentication suite failed because it assumed a prior bootstrap test had already created an administrator, and the logout path tried to find an account-page button on the workspace page. | `npx.cmd playwright test tests/e2e/practicum/auth-session.spec.ts --reporter=list` passed 5/5 after making bootstrap completion explicit and following the visible account-page logout path. | Authentication scenarios are isolated and repeatable. |
| `SB-Q-03` teacher workspace | The full suite timed out while creating and logging out an unrelated temporary owner before teacher login. | `npx.cmd playwright test tests/e2e/practicum/context-ui.spec.ts --reporter=list` passed 4/4 using a real teacher session. | Teacher workspace is verified against server identity. |
| Case role boundaries | Case tests changed only the browser preview role while retaining the global OWNER session. | `npx.cmd playwright test tests/e2e/practicum/commerce-cases.spec.ts --reporter=list` passed 5/5 using real STUDENT and OWNER sessions. | No server authorization rule was weakened. |
| `SB-D-11`, `SB-D-12` mobile detail | The prior record had no executed 390px result. | `npx.cmd playwright test tests/e2e/practicum/analytics-member-skill-map-api.spec.ts tests/e2e/practicum/analytics-member-page.spec.ts --reporter=list` passed 3/3. | Member skill map supports direct URL, authorization, and 390px without horizontal overflow. |

The full `tests/e2e/practicum` command still timed out at 600 seconds after 107/183 started scenarios. It is therefore `FAILED/UNVERIFIED`, not a passing full-suite result. The next RED/GREEN slice is server-derived curriculum deletion impact and submitted-evidence protection.

## 2026-07-30 Foundation real-session and forbidden-state slice

| Scenario | RED | GREEN | Result |
|---|---|---|---|
| `PHASE-A-01` to `PHASE-A-07` | The legacy phase-A file had 10 failures because it changed `localStorage` roles while retaining an OWNER server session. | `npx.cmd playwright test tests/e2e/practicum/phase-a-foundation.spec.ts --reporter=list` passed 19/19 after each student path established a real STUDENT session and selected the matching workspace view. | Login redirect, direct URLs, navigation, refresh, loading, and student/owner boundaries are exercised against server sessions. |
| `SB-Q-04` student opens data center directly | The student received API `403`, but `/practicum/data-center` rendered only `data-data-center-error`. | The same 19/19 suite verifies `data-forbidden` for every management route after the page prioritizes authorization state over generic load error. | Unauthorized users see a clear restricted state and not a misleading data failure. |

Quality gate: `npm.cmd run typecheck` passed. The complete Playwright suite and production build remain pending and are not reported as passed.

## 2026-07-30 Navigation real-session slice

`npx.cmd playwright test tests/e2e/practicum/navigation-permissions.spec.ts --reporter=list` passed 4/4. The initial RED run had three failures because a fresh browser context retained the default OWNER storage state while the test expected a student navigation layout. Each affected path now establishes a STUDENT server session before selecting the matching workspace view. The 375px, 768px, 1024px, and 1440px case-page checks all pass without horizontal overflow for the student journey.

## 2026-07-30 Review queue server-source slice

`teacher-review.spec.ts` first timed out while an OWNER session attempted to render student-only local practice controls. The queue field scenario now creates an authenticated STUDENT submission through `/api/practicum/submissions`, then verifies the OWNER review queue from a separate authenticated context. `npx.cmd playwright test tests/e2e/practicum/teacher-review.spec.ts --grep "owner sees complete submission fields" --reporter=list` passed 1/1. The remaining review filter, return, revision, and grading legacy cases are still being migrated and are not marked as complete.

## 2026-08-10 LearnEC 阶段 D：批阅、评分与学情闭环

验收范围严格限定为阶段 D：ADMIN 在授权班级内查看提交证据、按 70/30 权重评分并保存不可变评分修订、带反馈退回、学生重新提交新版本、班级学情聚合和服务端 `.xlsx` 成绩导出。未实现阶段 E 的公共实训中心、赛考业务或其它占位模块；任务、提交、成绩、权限与导出审计均以 Prisma/PostgreSQL 为事实来源。

| 验收项 | 命令或路径 | 结果 |
|---|---|---|
| 阶段 D 隔离闭环 | `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-d-review-data.spec.ts` | PASS；13 个迁移成功，Playwright 5/5 通过 |
| 评分与审计 | 自动/人工加权、两次评分修订、必填退回反馈、`.xlsx` ZIP 头和导出 AuditEvent | PASS |
| 权限与并发 | STUDENT 管理端 API 拒绝、同实训室非本班教职 ADMIN 队列隔离、评分/退回竞态返回单一 200 和单一 409 | PASS |
| 版本与响应式 | 退回后重提生成版本 2；`/admin/reviews`、`/admin/data` 在 390x844 下 `scrollWidth - clientWidth = 0` | PASS |
| 类型门禁 | `npm.cmd run typecheck` | PASS |
| 生产构建 | `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build` | PASS；Nuxt 3.21.8 / Nitro 2.13.4 构建成功 |
| 4310 服务 | `node .output/server/index.mjs` with `PORT/NITRO_PORT=4310`；`http://127.0.0.1:4310/admin/reviews` | PASS；HTTP 200 |

残余风险：本轮没有运行历史全量 Playwright 套件，也没有部署生产环境；两者不属于阶段 D 的本地验收范围。Prisma 7 配置弃用与 Node 模块 exports 弃用警告不影响本次门禁结果。阶段 D 本地提交标签为 `phase-D: review grading and learning analytics closure`。

## 2026-08-01 Task dependency unlock slice

| BDD | RED | GREEN | Result |
|---|---|---|---|
| `SB-PLAN-002` locked task submission | `task-dependency-api.spec.ts` expected `409 TASK_LOCKED`, but the API returned `200`. | The focused suite passed after the submission API rejects `LOCKED` tasks before it creates evidence. | Students cannot submit a locked dependent task. |
| `SB-PLAN-002` read-time unlock | The task list returned a dependent task with `LOCKED` status even when every prerequisite was graded. | The focused suite passed after server-side dependency evaluation updates the task to `AVAILABLE` in a Prisma transaction. | The student receives a persisted unlock state. |
| `SB-PLAN-002` grade-time unlock | The teacher grade API left a dependent task in `LOCKED` after grading its prerequisite. | The focused suite passed after grading, task-state transition, and dependency unlock share one Prisma transaction. | A successful prerequisite grade immediately unlocks eligible dependent work. |

Focused verification: `npx.cmd playwright test tests/e2e/practicum/task-dependency-api.spec.ts --reporter=list` passed 3/3. `npx.cmd playwright test tests/e2e/practicum/assignments-api.spec.ts --reporter=list` passed 3/3, and `npm.cmd run typecheck` passed after all three behaviors. Broader regression and production build remain required before this slice can be marked `IMPLEMENTED_VERIFIED`.

## 2026-08-01 Submission idempotency slice

| BDD | RED | GREEN | Result |
|---|---|---|---|
| `SB-SUB-002` repeated submission key | A second request with the same `Idempotency-Key` created version `2`; the test expected the original version `1`. | The API now records the first submission in `SubmissionIdempotencyKey` under a database uniqueness constraint and returns that submission on retry. | A retry produces no additional immutable version. |

Migration: `20260801090000_submission_idempotency` adds `SubmissionIdempotencyKey`, its scoped unique index, and a cascading foreign key to `Submission`. `npx.cmd prisma migrate deploy` applied the migration; `npx.cmd prisma migrate status` then reported the database schema up to date. Focused verification: `npx.cmd playwright test tests/e2e/practicum/task-dependency-api.spec.ts --reporter=list` passed 4/4 and `npm.cmd run typecheck` passed. Broader regression, build, concurrent duplicate-request coverage, and a rollback script remain `PARTIAL`.

## 2026-08-07 Isolated Three-Role Browser Acceptance

The Windows Nuxt development server was reproducibly able to listen while timing out every HTTP request. The isolated runner now builds the current workspace and starts the generated local Nitro server instead. A RED runtime contract first failed because the runner still invoked `nuxi dev`; the updated contract passed with the production-server requirement.

`npm.cmd run test:e2e:isolated` then passed once in 79.4 seconds. The run created only a labelled loopback PostgreSQL container, a random local port, and database `practicum_e2e_run_2026_08_07t06_33_31_852z`; it applied 9 migrations, seeded deterministic fixtures, built Nuxt, and passed all three Playwright cases:

- `J-TEACHER-01`: teacher enters an assigned classroom workbench.
- `J-ADMIN-01`: owner reaches room settings, templates, and competitions.
- `J-STUDENT-01`: student reaches only server-granted competition and template surfaces.

The run evidence is retained in `.artifacts/practicum-e2e/run-2026-08-07t06-33-31-852z/`. After completion, the labelled temporary container and the test listener were removed. Read-only post-run checks found no listener on 3001 or 4186; the default `digital-commerce-practicum-postgres` container remained healthy. No deployment, SSH, production-server operation, or default-database operation was performed.

Verification also passed: `node --test tests/runtime/isolated-e2e-contract.test.mjs tests/runtime/isolated-e2e-fixtures-contract.test.mjs` (8/8) and `npm.cmd run typecheck`.

## 2026-08-01 Progress, audit and frontend bridge slice

| Capability | Frontend connection | Result |
|---|---|---|
| Server progress aggregation | `/practicum/progress` calls `/api/practicum/progress`; its primary progress rows use Prisma aggregate data, with loading, empty, error, forbidden and retry states. | `PARTIAL`: continuing-learning cards and notifications still have legacy Store compatibility data. |
| Immutable grade history | `GradeRevision` migration records each teacher grading decision beside the current `Grade` snapshot. | `PARTIAL`: history display and Prisma return flow remain to be connected to the review UI. |
| Learning audit telemetry | Activities resolve the current `StudentTask`, then send server Heartbeat and Visibility events to `ActivityLog`; failures do not interrupt learning. | `PARTIAL`: duration aggregation and staff-side log views remain absent. |
| New student submission route | When an activity maps to a Prisma task, the activity page reads and submits evidence through `/api/practicum/student-tasks/:taskId`, preserving versions and idempotency. | `PARTIAL`: unmapped legacy activity data remains on its compatibility route until the plan/activity ID migration is complete. |

Database migrations `20260801103000_grade_revisions` and `20260801110000_learning_audit_events` were applied. `npx.cmd prisma migrate status`, `npm.cmd run typecheck`, and `npm.cmd run build` passed. `frontend-backend-bridge.spec.ts` passed 4/4 after the progress page race fix; `progress-mobile.spec.ts` passed at 390px with no horizontal overflow. The complete suite, concurrent idempotency test, rollback rehearsal, attachment storage, automatic grading, dependency-cycle validation and the full legacy JSON retirement are still `PARTIAL` or `MISSING`.

## 2026-08-10 LearnEC 阶段 B：工单组课与发布

验收范围严格限定为阶段 B：ADMIN 从三类资源库组建综合工单，编排媒体、五类题型和多模块沙盘定义，设置自动/人工评分权重与区块权重，保存模板、一键复制、学生视角安全预览，并向班级幂等发布且为每名有效学生生成一条 `StudentTask`。阶段 C 的学生作答、沙盘运行与提交，阶段 D 的批阅、成绩与学情分析，以及阶段 E 的赛考引擎均未提前实现。

| 验收项 | 命令或路径 | 结果 |
|---|---|---|
| Prisma 合同 | `npx.cmd prisma format`、`npx.cmd prisma validate`、`npx.cmd prisma generate` | PASS；Prisma Client 6.19.0 生成成功 |
| 隔离业务闭环 | `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-b-work-orders.spec.ts` | PASS；11 个迁移成功，Playwright 4/4 通过 |
| 类型门禁 | `npm.cmd run typecheck` | PASS |
| 生产构建 | `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build` | PASS；Nuxt 3.21.8 / Nitro 2.13.4 构建成功 |
| 默认本地数据库 | `npx.cmd prisma migrate deploy`、`npm.cmd run db:seed` | PASS；阶段 B migration 已应用，资源和模板 Seed 成功 |
| 4310 登录页 | `GET http://127.0.0.1:4310/login` | PASS；HTTP 200 |
| 4310 未登录守卫 | `GET http://127.0.0.1:4310/admin/tasks` | PASS；HTTP 302，跳转 `/login` |
| 4310 管理员工单页 | `POST /api/auth/login` 后 `GET /admin/tasks` | PASS；HTTP 200，页面包含“实训任务管理” |

阶段 B 实现提交为 `0a173eb6d17370929c3c31b854a59a1f5ee64d93`（`phase-B: work-order authoring and publication`）。

残余风险：本轮没有执行历史全量 Playwright 套件，也没有部署生产环境；这两项不属于本次阶段 B 本地验收范围。Prisma 命令提示 `package.json#prisma` 将在 Prisma 7 弃用，但不影响当前 Prisma 6.19.0 验收结果。阶段 B 本地服务验收地址为 `http://127.0.0.1:4310`。

## 2026-08-10 LearnEC 阶段 C：学生作业与多子沙盘

验收范围严格限定为阶段 C：STUDENT 读取本人 `StudentTask`、按状态筛选、进入左侧指导书/右侧工作台、切换五类受控沙盘、保存数据库草稿与证据快照、由服务端拦截缺项，并将最终结果幂等写入 `Submission`、`SubmissionVersion` 与 `SubmissionPart`。未实现阶段 D 的批阅与学情分析，也未实现阶段 E 的赛考引擎。

| 验收项 | 命令或路径 | 结果 |
|---|---|---|
| Prisma 合同 | `npx.cmd prisma format`、`npx.cmd prisma validate`、`npx.cmd prisma generate` | PASS；新增沙盘会话、快照与分区提交模型 |
| 阶段 C 隔离闭环 | `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/phase-c-student-sandbox.spec.ts` | PASS；12 个迁移成功，Playwright 4/4 通过 |
| 权限与数据隔离 | STUDENT 本人任务、ADMIN 越权、他人任务 404、`studentTaskId` 快照断言 | PASS |
| 提交门禁 | 五模块缺项汇总、完整提交、相同幂等键重放 | PASS；首次版本保持 `1` |
| 类型门禁 | `npm.cmd run typecheck` | PASS |
| 生产构建 | `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build` | PASS；Nuxt 3.21.8 / Nitro 2.13.4 构建成功 |
| 默认本地数据库 | `npx.cmd prisma migrate deploy`、`npm.cmd run db:seed` | PASS；阶段 C migration 与五沙盘 Seed 工单已应用 |
| 4310 真实浏览器 | `student1` 登录后访问 `/center/assignments` 与 `/center/tasks/:id/sandbox` | PASS；Seed 工单 1 条、沙盘页签 5 个 |
| 响应式 | 390x844 真实页面与 Playwright 溢出断言 | PASS；`scrollWidth - clientWidth = 0` |

验收截图：`output/playwright/phase-c-assignment-center.png`、`output/playwright/phase-c-sandbox-desktop.png`、`output/playwright/phase-c-sandbox-mobile.png`。阶段 C 本地验收地址为 `http://127.0.0.1:4310`；实现提交将在用户验收通过后单独创建。

残余风险：本轮只执行阶段 C 专项 Playwright 套件，没有宣称历史全量 Playwright 套件通过，也未部署生产环境。Prisma 7 的 seed 配置弃用提示不影响当前 Prisma 6.19.0 结果。

## 2026-08-11 S2 成绩发布与学生任务范围阻断项

本轮只关闭 S2 的两个共享阻断项：成绩发布可见性与学生任务全链路范围。`Grade` 以 `releasedAt`、`releasedById` 为发布事实源；保存和修订默认未发布，修订已发布成绩会在同一事务中自动撤回。学生任务范围统一校验任务本人、任务所属班级、当前有效 STUDENT enrollment、当前实训室范围，以及班级与实训室的组织一致性。

| 验收项 | 命令或路径 | 结果 |
|---|---|---|
| TDD RED：发布字段 | `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/s2-grade-release-scope.spec.ts` | RED；未实现时 `releasedAt` 为 `undefined`，不满足未发布投影合同 |
| TDD RED：进度聚合隐藏 | 同一专项命令 | RED；未接入投影时 `/api/practicum/progress` 暴露未发布平均分 `94` |
| S2 专项 GREEN | 同一专项命令（最终运行） | PASS；14 个迁移成功，Playwright 3/3 通过 |
| 成绩状态机 | 评分未发布、发布、撤回、重复撤回、已发布后修订 | PASS；重复撤回返回 `409/GRADE_NOT_RELEASED`，修订自动撤回 |
| 学生成绩投影 | center/兼容详情、任务列表、提交详情、幂等重放、progress | PASS；未发布统一返回 `grade: null`，不返回分数、评语或评分内部字段 |
| 学生任务范围 | 停用所属班级 enrollment、保留同实训室其他 enrollment、班级/实训室组织不一致 | PASS；列表排除，详情和所有写入口拒绝 |
| Prisma 与类型门禁 | `npx.cmd prisma validate`、`npx.cmd prisma generate`、`npm.cmd run typecheck` | PASS；Prisma Client 6.19.0 生成成功，Nuxt 类型检查通过 |
| 生产构建 | `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build` | PASS；Nuxt 3.21.8 / Nitro 2.13.4 构建成功 |
| 相关联合回归 | S2、phase C、phase D、旧 student/submission 套件联合运行 | PARTIAL；13 个场景通过，旧固定账号套件因独立认证夹具返回 `401/429`，旧活动提交合同返回 `403`，未归因于 S2 范围或成绩断言 |

残余风险：历史兼容套件的固定账号/登录限流隔离仍需单独治理，本报告不宣称全量 Playwright 通过。本轮未部署、未推送，也未操作生产环境。Prisma 7 配置弃用和 Node exports 弃用警告不影响本次 S2 专项结果。
