# 学生真实学习闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将学生任务、学习、提交、退回、再次提交、评分和刷新恢复统一到服务端真实数据链路。

**Architecture:** 复用现有 `StudentTask`、提交、评分和学习审计 API，先补 API 合同与服务端行为证据，再把学生页面的业务来源切换为服务端。保留现有 LearnEC shell 和视觉改动，逐页替换 localStorage 业务回退。每个任务只修改明确的写集，完成后单独验证再进入下一任务。

**Tech Stack:** Nuxt 3、Vue 3、TypeScript、Prisma/PostgreSQL、Playwright、Markdown BDD。

## Global Constraints

- 保留工作区已有 LearnEC 未提交修改，不使用 `git reset --hard`、`git clean`、`git checkout/restore`。
- 不修改 `.env`，不执行 `prisma migrate reset`、`prisma db push` 或破坏性数据库操作。
- 不启动第二个 Nuxt 服务，不访问远程服务器，不执行部署。
- 生产业务数据必须由服务端和 PostgreSQL 提供，localStorage 不得覆盖服务端结果。
- 每个生产行为必须先有失败测试，并记录 `RED -> GREEN` 输出。
- 角色、实训室、对象归属、状态转换、重复提交和刷新恢复必须有测试。

### Task 1: 锁定学生闭环 BDD 和 API 合同

**Files:**
- Modify: `docs/bdd/learning-progress.feature.md`
- Modify: `docs/bdd/submissions-api.feature.md`
- Modify: `docs/api-contract.md`
- Create: `tests/e2e/practicum/student-learning-closure.spec.ts`

**Interfaces:**
- Consumes: 现有 `/api/practicum/student/tasks`、`/api/practicum/student-tasks/:taskId`、`/api/practicum/student-tasks/:taskId/submissions`、教师退回/评分 API。
- Produces: 稳定场景 ID `C-STUDENT-001` 至 `C-STUDENT-010` 和 Playwright 选择器契约。

- [ ] 写 Given/When/Then 场景：可用任务、锁定任务、保存草稿、提交、重复提交、空提交、退回、再次提交、评分、刷新恢复、越权访问。
- [ ] 运行新增 Playwright 场景，确认至少一个场景因页面当前没有完整服务端状态而失败；若失败停在登录或环境错误，先修正测试前置条件并重新观察目标失败。
- [ ] 在 API 合同中记录请求、响应、错误码、幂等键、角色和状态转换。
- [ ] 只提交文档和测试文件，不修改生产代码，验证 `npx.cmd playwright test tests/e2e/practicum/student-learning-closure.spec.ts --reporter=list` 的 RED 证据。

### Task 2: 补齐服务端学生任务状态和提交合同

**Files:**
- Modify: `server/api/practicum/student/tasks.get.ts`
- Modify: `server/api/practicum/student-tasks/[taskId]/index.get.ts`
- Modify: `server/api/practicum/student-tasks/[taskId]/submissions/index.post.ts`
- Modify: `server/api/practicum/student-tasks/[taskId]/heartbeat.post.ts`
- Modify: `server/services/task-unlock.ts`
- Test: `tests/e2e/practicum/student-tasks-api.spec.ts`

**Interfaces:**
- Consumes: 当前登录会话、当前实训室上下文和 Prisma `StudentTask` 数据。
- Produces: 统一任务 DTO，包含 `status`、`availability`、`dueAt`、`draft`、`versions`、`feedback` 和 `grade`。

- [ ] 先添加 API 测试，覆盖学生只能读自己的任务、锁定任务不可提交、空文本拒绝、重复幂等键不重复创建、退回后可再次提交、已评分任务不可非法覆盖。
- [ ] 运行 API 测试确认 RED，保存命令和失败原因。
- [ ] 用最小改动统一 DTO 和状态转换，所有写操作使用事务或现有服务端幂等机制。
- [ ] 运行 API 测试确认 GREEN，再运行已有 `submissions-api.spec.ts`、`task-dependency-api.spec.ts` 和 `isolation.spec.ts`。

### Task 3: 将任务页切换为服务端唯一业务来源

**Files:**
- Modify: `pages/practicum/tasks.vue`
- Modify: `composables/usePracticumServer.ts`
- Test: `tests/e2e/practicum/student-learning-closure.spec.ts`

**Interfaces:**
- Consumes: Task 2 的任务 DTO。
- Produces: `/practicum/tasks` 的服务端分页、状态筛选、去学习链接和刷新恢复。

- [ ] 先扩展 Playwright：学生登录后看到服务端任务字段，点击任务进入真实活动 URL，刷新任务页仍保留状态。
- [ ] 运行测试确认当前 localStorage/兼容数据导致的 RED。
- [ ] 将列表、统计、状态和去学习目标统一从服务端任务计算；本地 Store 只能保存非业务 UI 状态。
- [ ] 补 loading、empty、error、forbidden、分页和移动端断点。
- [ ] 运行学生任务、进度移动端和导航权限测试，确认 GREEN。

### Task 4: 将活动页的草稿、提交、反馈和评分结果统一到服务端

**Files:**
- Modify: `pages/practicum/activities/[activityId].vue`
- Modify: `pages/practicum/submissions/[submissionId].vue`
- Modify: `composables/usePracticumServer.ts`
- Test: `tests/e2e/practicum/student-learning-closure.spec.ts`

**Interfaces:**
- Consumes: Task 2 的任务详情、提交版本、反馈和评分 DTO。
- Produces: 学生可执行的草稿、提交确认、版本历史、退回修改和评分结果界面。

- [ ] 先添加用户路径断言：草稿保存提示、提交中禁用、提交成功、反馈可见、退回后再次提交、评分结果可见、刷新恢复。
- [ ] 运行测试确认 RED。
- [ ] 删除会覆盖服务端状态的本地提交回退；对没有服务端任务的旧 seed 活动显示明确迁移状态，不伪造已提交结果。
- [ ] 增加附件元数据展示、错误重试和非法状态提示，但不在本任务实现对象存储。
- [ ] 运行 `student-activities*.spec.ts`、`teacher-review.spec.ts`、`submission-server-source.spec.ts` 和新增闭环测试。

### Task 5: 让学习计划页和进度页使用服务端任务状态

**Files:**
- Modify: `pages/practicum/learn/[planId].vue`
- Modify: `pages/practicum/progress.vue`
- Modify: `server/api/practicum/progress.get.ts`
- Test: `tests/e2e/practicum/student-learning-closure.spec.ts`

**Interfaces:**
- Consumes: 服务端任务状态和计划分配关系。
- Produces: 当前任务、百分比、继续学习入口、评分汇总和刷新一致性。

- [ ] 先添加继续学习、完成百分比和无任务状态的失败测试。
- [ ] 运行 RED。
- [ ] 用服务端任务计算当前可学习任务和进度，修正接口返回上限并保持学生对象隔离。
- [ ] 运行 `progress-notifications.spec.ts`、`progress-mobile.spec.ts`、`home-hero-entry-ui.spec.ts` 和闭环测试。

### Task 6: 完成本期门禁和本地提交

**Files:**
- Modify: `docs/feature-gap-matrix.md`
- Modify: `docs/acceptance-test-report.md`
- Modify: `docs/checkpoints/2026-08-03.md` only if the current checkpoint format requires a new entry

- [ ] 检查所有新增测试均有 RED/GREEN 命令和结果记录。
- [ ] 运行 `npm.cmd run typecheck`。
- [ ] 运行 `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`，若受限环境再次出现 `EPERM readlink`，标记为环境阻塞，不宣称 build 通过。
- [ ] 运行本期 Playwright、权限、隔离和相关全量 practicum 测试。
- [ ] 运行 `git diff --check`，检查没有 token、密码、cookie、构建产物和用户无关文件。
- [ ] 只 stage 本期文件，检查 staged diff，再创建本地提交 `feat(practicum): complete server-backed student learning loop`。

## Exit Gate

本期只有在学生能完成发布计划到评分结果的完整浏览器路径、刷新后状态保持、学生/教师对象隔离、重复提交幂等、移动端无横向溢出，并且 typecheck、build、相关 Playwright 和 diff 检查有证据时才标记 `PASS`。远程部署保持 `UNVERIFIED`，留到数据库迁移和部署专项计划。
