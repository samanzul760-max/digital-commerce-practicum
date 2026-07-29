# 智能体阶段 A 验收报告

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

`npx.cmd playwright test tests/e2e/practicum --reporter=list` 于 2026-07-28 完成，结果为 145 passed、5 failed，耗时约 4.7 分钟，故全量门禁为 `FAILED`。

- `student-activities-s3-010.spec.ts`：等待瞬时 `[data-loading]` 状态失败。
- `teacher-review.spec.ts` 4 项：审核队列仍依赖旧本地身份预览和数据状态，与服务端权威队列为空的当前契约不一致。

认证开通与登录的 8 项 focused 测试均通过，但因为上述全量回归失败，本轮不能报告生产发布完成，部署状态为 `UNVERIFIED`。

## 本轮未通过或未验证

- 完整 `npx.cmd playwright test tests/e2e/practicum --reporter=list` 在 243 秒后超时并出现 `EPIPE`，记为 `UNVERIFIED/FAILED`，旧报告的 128/128 不能作为本轮证据。
- 相关回归套件 19 个用例中 15 个通过、4 个失败。失败均来自 `teacher-review.spec.ts` 使用 OWNER session 切换“学生视角”后仍把提交写入 localStorage；服务端队列按新契约为空。该身份预览与真实服务端角色尚未统一，提交/审核整体保持 `PARTIAL`。
