# 学生服务端闭环与三角色基础 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Each task must follow TDD RED-GREEN and the timeout rule below.

**Goal:** 先完成学生提交闭环的服务端事实来源和 Student/Teacher/Owner 权限基础，为后续教师工作台与管理员扩展提供稳定边界。

**Architecture:** 页面只通过服务端 API 读取和写入业务数据。当前计划、目录、通知和兼容数据继续走 `server/utils/practicum-repository.ts`，班级任务、提交版本和评分继续走现有 Prisma 服务；不新增 schema 或迁移。`usePracticumStore` 只保留身份和 UI 状态，学生主流程不再用 localStorage 业务 fallback。

**Tech Stack:** Nuxt 3.21.8, Vue 3.5.39, TypeScript 5.9.3, Prisma 6.19.0, Playwright 1.61.1, Microsoft Edge。

## Global Constraints

- 只修改 `C:\Users\29053\Desktop\智能体\数字商贸实训工作台`。
- 保留所有已有未提交改动；每次编辑前运行 `rg --files` 和 `git status --short`。
- 不修改 `prisma/schema.prisma`、`prisma/migrations/`、`.env`、部署脚本或远程环境。
- 不执行 SSH、PM2、Nginx、Docker 变更、Prisma migration、`db push`、`db reset`、`git reset --hard`、`git clean`、整仓 checkout/restore。
- 不启动第二个 Nuxt 服务；只检查当前已有服务，当前 `4174` 未运行且 `3001` 已有服务时不得抢占或重启端口。
- 保留现有 `PracticumShell.vue`、`PracticumSidebar.vue`、`PracticumTopbar.vue` 的视觉基础；可扩展但不能重建。
- 新增行为必须先写 BDD/TDD 失败测试并确认 RED，再写最小生产代码。
- 测试若重跑超时、卡住或出现疑似死循环：立即停止该场景，保留日志并标记 `UNVERIFIED`，不得自动重试或把超时当作通过。
- 每个任务结束前运行 `git diff --check`；测试通过才能进入下一任务。

## File Map and Ownership

本阶段按以下写入集合隔离子任务，禁止两个实现子智能体同时修改同一文件：

- 权限/API：`domain/practicum/permissions.ts`、`server/api/practicum/teacher/**`、`server/services/**`、对应 API 测试。
- 学生页面：`pages/practicum/learn/[planId].vue`、`pages/practicum/activities/[activityId].vue`、`pages/practicum/tasks.vue`、对应学生页面测试。
- 服务端客户端桥接：`composables/usePracticumServer.ts`、对应桥接测试；该任务完成后才允许页面任务接入新方法。
- 主线程集成：共享 Shell、`PracticumSidebar.vue`、集成 Playwright、文档和最终验证。

后续教师工作台和管理员扩展不在本计划内，分别建立独立计划，避免本阶段与其争用页面和共享组件。

---

### Task 1: 建立学生服务端事实来源的 BDD/TDD 合同

**Files:**
- Create: `docs/bdd/student-server-source.feature.md`
- Create: `tests/e2e/practicum/student-closure-server-source.spec.ts`
- Test: `tests/e2e/practicum/student-closure-server-source.spec.ts`

**Interfaces:**
- Consumes: 现有测试登录助手、`/api/practicum/plans`、`/api/practicum/submissions`、`/api/practicum/submissions/:activityId/return`、`/api/practicum/submissions/:activityId/grade`。
- Produces: 带稳定 feature ID 的核心场景名称，供后续页面和集成任务复用。

- [ ] **Step 1: 写失败场景**。在 `student-closure-server-source.spec.ts` 中加入以下四个测试，测试名必须带 `[ORIGINAL-S6-001]` 或现有学生闭环 ID，并使用真实 API：

```ts
test('[ORIGINAL-S6-001] clearing local business state does not hide server submission result', async ({ page }) => {})
test('[ORIGINAL-S6-001] returned work requires feedback and survives student refresh', async ({ page }) => {})
test('[ORIGINAL-S6-001] resubmission increments immutable version after return', async ({ page }) => {})
test('[ORIGINAL-S6-001] forbidden role cannot read or mutate student submission', async ({ page, browser }) => {})
```

- [ ] **Step 2: 运行 RED**。

Run: `npx.cmd playwright test tests/e2e/practicum/student-closure-server-source.spec.ts --reporter=list`

Expected: 新增场景因页面仍依赖本地业务状态或教师权限边界未完成而失败；若测试挂起或超过一次明确超时，立即停止并记录 `UNVERIFIED`，不得重跑。

- [ ] **Step 3: 写 BDD 文档**。每个场景按 `Given / When / Then / Refresh / Permission / Error` 记录角色、服务端数据、用户操作、接口结果、刷新结果和错误状态，不写凭据、token 或私有 URL。

- [ ] **Step 4: 验证合同文件**。

Run: `node scripts/validation-runner.mjs --help`

Expected: 若脚本支持目标文件参数则只验证该 feature；若命令参数不匹配，只保留 BDD 文档并在报告标记“验证器参数未确认”，不要改脚本。

- [ ] **Step 5: Commit**。

```powershell
git add docs/bdd/student-server-source.feature.md tests/e2e/practicum/student-closure-server-source.spec.ts
git commit -m "test: define student server-source closure"
```

### Task 2: 统一服务端客户端桥接和错误状态

**Files:**
- Modify: `composables/usePracticumServer.ts`
- Modify: `tests/e2e/practicum/frontend-backend-bridge.spec.ts`
- Test: `tests/e2e/practicum/frontend-backend-bridge.spec.ts`

**Interfaces:**
- Consumes: 现有服务端端点和 `useCsrfHeaders()`。
- Produces: 页面使用的 typed 方法：`getSubmission(activityId)`, `submitPractice(activityId, text)`, `returnSubmission(activityId, feedback)`, `gradeSubmission(activityId, rubricScores, feedback)`, `getStudentTask(taskId)`, `submitStudentTask(taskId, text)`；失败时保留 `$fetch` 的 HTTP 错误，不返回本地替代实体。

- [ ] **Step 1: 写失败断言**。在桥接测试中拦截或请求服务端接口，断言学生页加载、提交和刷新都发起 API 请求；断言 API 返回 500/403 时页面显示 `data-error` 或 `data-forbidden`，且不显示 store 中旧提交内容。

- [ ] **Step 2: 运行 RED**。

Run: `npx.cmd playwright test tests/e2e/practicum/frontend-backend-bridge.spec.ts --reporter=list`

Expected: 至少一个断言失败，原因是旧页面仍使用 `store` 计算业务内容或没有错误状态；超时按 Global Constraints 处理。

- [ ] **Step 3: 最小实现**。只补充缺失的 typed API 方法、参数校验和错误透传；不得在 composable 内读取 `usePracticumStore()`，不得把 API 失败转成 seed 数据。

- [ ] **Step 4: 运行 GREEN**。

Run: `npx.cmd playwright test tests/e2e/practicum/frontend-backend-bridge.spec.ts --reporter=list`

Expected: 该文件通过；若失败，修复实现而不是放宽断言。

- [ ] **Step 5: Commit**。

```powershell
git add composables/usePracticumServer.ts tests/e2e/practicum/frontend-backend-bridge.spec.ts
git commit -m "refactor: keep practicum business bridge server-backed"
```

### Task 3: 学生学习与提交页面移除业务 fallback

**Files:**
- Modify: `pages/practicum/learn/[planId].vue`
- Modify: `pages/practicum/activities/[activityId].vue`
- Modify: `pages/practicum/tasks.vue`
- Modify: `tests/e2e/practicum/student-closure-server-source.spec.ts`
- Test: `tests/e2e/practicum/student-closure-server-source.spec.ts`

**Interfaces:**
- Consumes: Task 2 的 typed server methods；现有 `PracticumStatePanel`、共享表单和状态 class。
- Produces: 页面加载状态 `loading | ready | empty | error | forbidden`；提交状态 `NOT_STARTED -> IN_PROGRESS -> SUBMITTED -> RETURNED -> SUBMITTED -> GRADED`；刷新后由 API 结果恢复。

- [ ] **Step 1: 完善 RED 场景**。使用固定测试账号和服务端请求准备提交，页面操作断言：
  - 草稿不增加版本；
  - 提交后显示 version 1；
  - 教师退回必须填写反馈；
  - 学生刷新后显示 RETURNED 和反馈；
  - 重提显示 version 2 且保留 version 1；
  - 评分后刷新显示分数和反馈；
  - localStorage 清空后页面仍显示服务端状态。

- [ ] **Step 2: 运行 RED**。

Run: `npx.cmd playwright test tests/e2e/practicum/student-closure-server-source.spec.ts --reporter=list`

Expected: 失败集中在页面仍从 `store.state.practiceSubmissions`、`store.state.plans` 或 `store.getPlanNodes()` 读取业务数据。

- [ ] **Step 3: 最小实现**。为每个页面增加独立的 `isLoading`, `loadError`, `isForbidden` 和服务端响应 refs；请求期间清空旧业务 ref；请求失败只设置错误状态；成功后只使用 API 响应渲染。`localStorage` 仅允许保留 UI 偏好，不得读取提交、计划、节点、活动、通知或评分业务字段。

- [ ] **Step 4: 运行 GREEN**。

Run: `npx.cmd playwright test tests/e2e/practicum/student-closure-server-source.spec.ts --reporter=list`

Expected: 学生闭环场景通过；超时场景只记录 `UNVERIFIED`，不自动重试。

- [ ] **Step 5: 运行学生回归**。

Run: `npx.cmd playwright test tests/e2e/practicum/student-learning-closure.spec.ts tests/e2e/practicum/student-activity-detail-closure.spec.ts --reporter=list`

Expected: 已有学生闭环无新增失败；若某个测试超时，停止该测试文件并记录具体测试名。

- [ ] **Step 6: Commit**。

```powershell
git add pages/practicum/learn/[planId].vue pages/practicum/activities/[activityId].vue pages/practicum/tasks.vue tests/e2e/practicum/student-closure-server-source.spec.ts
git commit -m "feat: render student closure from server state"
```

### Task 4: 三角色路由和基础能力权限

**Files:**
- Modify: `domain/practicum/permissions.ts`
- Modify: `middleware/practicum-auth.global.ts`
- Modify: `tests/e2e/practicum/access.spec.ts`
- Modify: `tests/e2e/practicum/navigation-permissions.spec.ts`
- Test: `tests/e2e/practicum/access.spec.ts`, `tests/e2e/practicum/navigation-permissions.spec.ts`

**Interfaces:**
- Consumes: 现有 `PracticumRole`, `AuthUser`, `canAccessRoute`, `canReview`, `canViewProgress`, `canSubmitWork` 和服务端会话。
- Produces: 教师可查看授权班级、进度和审核相关入口；教师不能直接获得管理员计划编辑、成员角色修改和培训室全局设置；学生仍不能访问管理员或教师审核数据；Owner 保持现有能力。

- [ ] **Step 1: 写失败测试**。增加真实 `teacher@example.test` 登录场景：
  - 教师能访问 `/practicum/classes`、班级详情和进度/审核入口；
  - 教师访问计划编辑、成员角色管理和 room settings 时显示 forbidden 或无写操作；
  - 学生访问教师审核页面和管理员页面仍 forbidden；
  - API 直接调用越权写操作返回 403。

- [ ] **Step 2: 运行 RED**。

Run: `npx.cmd playwright test tests/e2e/practicum/access.spec.ts tests/e2e/practicum/navigation-permissions.spec.ts --reporter=list`

Expected: 教师审核入口因 `canReview()` 和服务端 OWNER-only 校验失败；超时立即停止并标记 `UNVERIFIED`。

- [ ] **Step 3: 最小实现**。新增能力函数而不是把 `TEACHER` 加进所有 Owner 判断：`canViewClassroom`, `canManageClassAssignment`, `canReviewScopedSubmission`, `canManageRoomSettings`；页面和 API 分别使用对应函数。审核 API 必须先验证教师拥有该任务所属班级的教学范围，再执行退回或评分。

- [ ] **Step 4: 运行 GREEN**。

Run: `npx.cmd playwright test tests/e2e/practicum/access.spec.ts tests/e2e/practicum/navigation-permissions.spec.ts --reporter=list`

Expected: 三角色直接 URL、导航和 API 权限断言通过。

- [ ] **Step 5: Commit**。

```powershell
git add domain/practicum/permissions.ts middleware/practicum-auth.global.ts tests/e2e/practicum/access.spec.ts tests/e2e/practicum/navigation-permissions.spec.ts
git commit -m "feat: add scoped teacher permissions"
```

### Task 5: 阶段集成与安全验证

**Files:**
- Modify: `docs/permission-matrix.md`
- Modify: `docs/feature-completion-matrix.md`
- Create: `docs/parity/practicum-student-server-source-2026-08-07.md`
- Test: `tests/e2e/practicum/student-closure-server-source.spec.ts`, `tests/e2e/practicum/access.spec.ts`, `tests/e2e/practicum/navigation-permissions.spec.ts`

**Interfaces:**
- Consumes: Tasks 1-4 的功能、feature IDs 和测试证据。
- Produces: 阶段报告，明确 `green`, `partial`, `missing`, `UNVERIFIED`，供后续教师工作台计划使用。

- [ ] **Step 1: 检查变更范围**。

Run: `git status --short; git diff --check; git diff --name-only HEAD~4..HEAD`

Expected: 只包含本阶段文件和用户原有改动；不得出现 `.env`、schema、migration、部署脚本、远程项目路径。

- [ ] **Step 2: 运行 focused E2E**。

Run: `npx.cmd playwright test tests/e2e/practicum/student-closure-server-source.spec.ts tests/e2e/practicum/access.spec.ts tests/e2e/practicum/navigation-permissions.spec.ts --reporter=list`

Expected: 输出每个场景状态；超时或死循环场景立即终止并写入 `UNVERIFIED`。

- [ ] **Step 3: 运行 typecheck 和 build**。

Run: `npm.cmd run typecheck`

Run: `npm.cmd run build`

Expected: 两条命令都返回退出码 0；任何超时不重试，报告为 `UNVERIFIED`。

- [ ] **Step 4: 只读检查本地服务**。

Run: `Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3001,4174 } | Select-Object LocalAddress,LocalPort,OwningProcess`

Run: `try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3001/practicum -TimeoutSec 5).StatusCode } catch { 'UNVERIFIED: local service unavailable' }`

Expected: 不启动服务、不重启服务；记录当前监听端口和 HTTP 结果。

- [ ] **Step 5: 更新矩阵和 parity 报告**。只记录实际命令输出；不能把历史 build、旧测试或超时场景写成通过。明确未处理的教师公告/课堂执行、审批、审计、模板和比赛入口。

- [ ] **Step 6: Commit**。

```powershell
git add docs/permission-matrix.md docs/feature-completion-matrix.md docs/parity/practicum-student-server-source-2026-08-07.md
git commit -m "docs: record student closure and role foundation evidence"
```

## 阶段出口与后续计划

本计划只在学生闭环、服务端来源和三角色基础权限全部有新鲜证据时结束。教师公告、课堂执行、独立教师审核页、邀请/申请审批、统一审计、模板和比赛另行建立计划，不在本阶段偷偷扩张范围。

后续计划必须先读取本阶段 parity 报告和 `docs/permission-matrix.md`，再为教师和管理员任务重新划分互斥写入集合。
