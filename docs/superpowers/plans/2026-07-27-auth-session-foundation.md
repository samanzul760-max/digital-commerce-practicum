# 认证与会话基础 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前身份选择原型替换为可验证的账号登录、服务端 session 和受保护页面入口，为实训室、成员、计划权限提供真实身份基础。

**Architecture:** 使用 Nuxt/Nitro server routes 提供认证 API，服务端使用 HttpOnly session cookie；开发阶段使用项目内的受控 JSON 数据存储，密码只保存为不可逆摘要。前端通过 `useAuthSession` 获取 session，页面不再把 OWNER/STUDENT 选择当作登录凭据；现有教学业务 store 暂时保留，作为后续 API 迁移适配层。

**Tech Stack:** Nuxt 3、Vue 3、TypeScript、Nitro server routes、Node `crypto`、Playwright。

## Global Constraints

- 只抽象目标产品的登录、角色和实训室业务逻辑，不复制品牌、Logo、原文案、图片或私有接口。
- 不把真实账号、密码、Cookie、Token 写入代码、测试、日志、Skill 或文档。
- 先写 BDD 场景和失败测试，确认 RED 后再写生产代码。
- 页面必须覆盖 loading、empty、error、forbidden、success 和重复提交状态。
- 本次只实现认证基础，不声称已经完成目标产品全部功能。
- 每个验证通过的切片单独提交 Git；本次部署在构建验证后执行，部署失败必须如实记录。

---

### Task 1: 认证 BDD 合同

**Files:**
- Create: `docs/bdd/auth-session.feature.md`
- Test: `tests/e2e/practicum/auth-session.spec.ts`

**Interfaces:**
- 页面入口：`/practicum/profile`
- 登录表单字段：`identifier`、`password`
- 受保护页面：`/practicum`
- 成功状态：`data-authenticated-user`
- 错误状态：`data-auth-error`

- [x] **Step 1: Write the BDD scenarios**

覆盖：未登录访问工作台跳转登录；有效账号登录进入工作台；错误密码显示错误且不泄露账号；重复点击登录只发送一次；退出后受保护页不可访问；刷新后 session 仍有效；无效 session 返回登录态。

- [x] **Step 2: Add the Playwright contract test**

使用测试专用固定账号 `owner@example.test` 和 `student@example.test`，账号仅存在于测试数据，不使用用户提供的真实凭据。

- [x] **Step 3: Run the new test and verify RED**

Run: `npx.cmd playwright test tests/e2e/practicum/auth-session.spec.ts --reporter=list`

Expected: FAIL because the current profile page only supports local role selection and has no login form/API session.

- [x] **Step 4: Contract was included in the verified feature commit**

```powershell
git add docs/bdd/auth-session.feature.md tests/e2e/practicum/auth-session.spec.ts
git commit -m "test(practicum): define auth session behavior"
```

### Task 2: 服务端认证存储与 API

**Files:**
- Create: `server/utils/auth-store.ts`
- Create: `server/utils/auth-session.ts`
- Create: `server/api/auth/login.post.ts`
- Create: `server/api/auth/session.get.ts`
- Create: `server/api/auth/logout.post.ts`
- Test: `tests/unit/auth-store.test.ts`

**Interfaces:**
- `POST /api/auth/login` accepts `{ identifier, password }`, returns `{ user }` or `401 AUTH_INVALID_CREDENTIALS`.
- `GET /api/auth/session` returns `{ user }` or `401 AUTH_REQUIRED`.
- `POST /api/auth/logout` clears the HttpOnly cookie and returns `{ ok: true }`.
- `User` contains `id`, `displayName`, `role`, `roomIds` and no password/hash field.

- [ ] **Step 1: Add unit tests for password verification and session lookup**

测试空字段、错误密码、有效密码、未知 session 和过期 session。测试必须调用真实 store/helper，不测试 mock 的返回值。

- [ ] **Step 2: Run unit tests and verify RED**

Run: `npx.cmd vitest run tests/unit/auth-store.test.ts`

Expected: FAIL because the auth store and API helpers do not exist. If Vitest is not installed, first add the smallest supported test runner configuration and record it in the plan.

- [x] **Step 3: Implement minimal server auth**

Use Node `crypto.scryptSync`/`timingSafeEqual` for password verification, generate random session IDs, set `HttpOnly`, `SameSite=Lax`, `Path=/` cookies, and never return the hash.

- [ ] **Step 4: Run unit tests and verify GREEN**

Run: `npx.cmd vitest run tests/unit/auth-store.test.ts`.

- [ ] **Step 5: Commit the server contract**

```powershell
git add server tests/unit package.json package-lock.json
git commit -m "feat(practicum): add server auth session API"
```

### Task 3: 登录页面与受保护入口

**Files:**
- Create: `composables/useAuthSession.ts`
- Modify: `pages/practicum/profile.vue`
- Modify: `pages/practicum/index.vue`
- Modify: `components/practicum/PracticumTopbar.vue`
- Modify: `components/practicum/PracticumShell.vue`
- Test: `tests/e2e/practicum/auth-session.spec.ts`

- [x] **Step 1: Add assertions for login, logout, refresh and error states**
- [x] **Step 2: Run the focused test and capture the RED result**
- [x] **Step 3: Implement `useAuthSession` with loading/error/success state**
- [x] **Step 4: Add account login while preserving the existing role-preview compatibility path**
- [x] **Step 5: Add logout action and redirect to profile**
- [x] **Step 6: Run focused Playwright test and verify GREEN**
- [x] **Step 7: UI integration was included in the verified feature commit**

### Task 4: Regression and browser acceptance

**Files:**
- Modify: `docs/acceptance-test-report.md`
- Create: `tests/e2e/practicum/auth-session-mobile.spec.ts` if the existing suite needs a separate mobile fixture

- [x] **Step 1: Run typecheck**
- [x] **Step 2: Run build**
- [x] **Step 3: Run focused auth Playwright tests**
- [x] **Step 4: Run all practicum E2E tests: 128 passed**
- [x] **Step 5: Run `git diff --check` and inspect for sensitive values**
- [ ] **Step 6: Commit the verified acceptance report**

## Out of scope for this slice

- 真实数据库迁移和多实例共享 session 存储。
- 实训室创建、加入申请、成员邀请审批。
- 计划、活动、提交和审核的 API 迁移。
- 文件上传、统计导出和生产部署配置。

这些会在认证通过后按独立 BDD/TDD 切片实现，不能用本地身份切换冒充完成。
