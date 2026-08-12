# LearnEC 统一 UI 与真实功能对接实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有 Nuxt 业务 API、权限矩阵和数据状态机的前提下，把学生、教师和管理员工作台统一到 LearnEC 共享外壳，并完成授权角色切换、管理概览、Toast、分析图表与本地数据库启动兼容。

**Architecture:** 采用已确认的“共享 LearnEC 外壳 + 现有业务适配层”。认证角色始终由服务端 session 决定，前端只请求切换并重新加载工作区；管理概览通过现有成员、提交、培训室和 analytics 接口独立结算，数据库健康检查为只读探针。视觉组件继续复用 `learnec-spec.css`，Nuxt 特有规则集中到 `learnec-nuxt.css`。

**Tech Stack:** Nuxt 3.21.8、Vue 3.5.39、TypeScript 5.9、Nitro/H3、Prisma 6.19、Playwright 1.61、Node test、ECharts（页面懒加载）。

## Global Constraints

- 全局 Header 固定为 `首页 / 课程大厅 / 学员中心 / 实操学习 / 管理控制台`，右侧保留授权角色分段控件、通知、头像和主操作。
- 管理侧栏固定为 `概览 / 课程 / 计划 / 成员与培训室 / 作业批改 / 成绩与分析`，删除底部“教学管理”孤立卡片。
- 身份切换仅允许进入账号 `authorizedRoles`，服务端 session 是唯一权限事实源，前端状态不得提权。
- 管理概览展示在读学员数、活跃培训室、待批改作业、课程完成率；接口失败时显示局部失败状态，不写模拟数字。
- 页面背景使用 `#F8FAFC` 对应的设计 token，容器继续绑定 LearnEC 圆角、边框和阴影 token，不引入第二套视觉变量。
- ECharts 仅在成绩与分析页面客户端懒加载；无数据时显示诚实空状态，并提供可访问文字摘要。
- PostgreSQL 探针只执行 `SELECT 1`，不得返回连接串、数据库名、主机或异常堆栈。
- Docker 脚本不得执行 `prisma db push`、`migrate reset`、删除容器、删除卷或清空数据。
- 所有行为改动遵循 RED -> GREEN -> REFACTOR；只 stage 本计划明确列出的文件，不覆盖工作区已有用户改动。

---

### Task 1: 服务端授权角色切换

**Files:**
- Modify: `docs/bdd/auth-session.feature.md`
- Modify: `tests/e2e/practicum/auth-session.spec.ts`
- Modify: `server/utils/auth-store.ts`
- Create: `server/api/auth/switch-role.post.ts`
- Modify: `server/middleware/csrf.ts`
- Modify: `composables/useAuthSession.ts`

**Interfaces:**
- Consumes: `PracticumRole`、`AUTH_COOKIE`、`getSessionCsrfToken()`、现有 HttpOnly session cookie。
- Produces: `AuthUser.authorizedRoles: PracticumRole[]`、`setSessionActiveRole(token, role): 'OK' | 'SESSION_NOT_FOUND' | 'ROLE_NOT_AUTHORIZED'`、`POST /api/auth/switch-role`、`useAuthSession().switchRole(role)`。

- [x] **Step 1: 记录角色切换 BDD 场景**

  在 `docs/bdd/auth-session.feature.md` 增加三条稳定场景 ID：授权切换并刷新保持、未授权角色返回 403、缺少 CSRF 返回 403。

- [x] **Step 2: 写授权切换、越权和 CSRF 的失败测试**

  在 `tests/e2e/practicum/auth-session.spec.ts` 使用真实登录 cookie 和 `csrfHeaders(page)`：

  ```ts
  test('[BDD-AUTH-006] owner can switch to an authorized student role and refresh keeps it', async ({ page }) => {
    await loginAsOwner(page)
    const response = await page.request.post('/api/auth/switch-role', {
      headers: await csrfHeaders(page),
      data: { role: 'STUDENT' },
    })
    expect(response.status()).toBe(200)
    expect((await response.json()).user.role).toBe('STUDENT')
    expect((await page.request.get('/api/auth/session')).json()).resolves.toMatchObject({ user: { role: 'STUDENT' } })
  })

  test('[BDD-AUTH-007] student cannot switch to an unauthorized owner role', async ({ page }) => {
    await loginAsStudent(page)
    const response = await page.request.post('/api/auth/switch-role', {
      headers: await csrfHeaders(page),
      data: { role: 'OWNER' },
    })
    expect(response.status()).toBe(403)
    expect((await response.json()).data.code).toBe('ROLE_NOT_AUTHORIZED')
  })

  test('[BDD-AUTH-008] role switching requires csrf', async ({ page }) => {
    await loginAsOwner(page)
    const response = await page.request.post('/api/auth/switch-role', { data: { role: 'STUDENT' } })
    expect(response.status()).toBe(403)
  })
  ```

- [x] **Step 3: 运行 RED 并确认失败原因是接口缺失**

  Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/auth-session.spec.ts`

  Expected: FAIL；`POST /api/auth/switch-role` 返回 404，证明测试覆盖的是尚未实现的行为。

- [x] **Step 4: 扩展用户和会话数据结构**

  在 `server/utils/auth-store.ts` 中：

  ```ts
  export interface AuthUser {
    id: string
    identifier: string
    displayName: string
    role: PracticumRole
    authorizedRoles: PracticumRole[]
    roomIds: string[]
  }

  interface StoredSession {
    userId: string
    expiresAt: number
    csrfToken: string
    activeRole?: PracticumRole
    organizationId?: string
    roomId?: string
  }
  ```

  `publicUser()` 为旧用户补默认授权：OWNER 为 `['OWNER', 'STUDENT']`，其他角色为 `[role]`。`createSession()` 写入原始角色；`getSessionUser()` 用有效 `activeRole` 覆盖返回用户的 `role`。

- [x] **Step 5: 实现最小服务端切换接口与 CSRF 覆盖**

  `setSessionActiveRole()` 只接受 `authorizedRoles` 中的角色；`server/api/auth/switch-role.post.ts` 校验 session、请求体角色和授权集合，成功后返回新的公开用户。把 CSRF 中间件的受保护范围从仅 `/api/practicum/` 扩展到 `/api/practicum/` 和 `/api/auth/switch-role`。

- [ ] **Step 6: 运行 GREEN 并回归原认证测试**

  Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/auth-session.spec.ts`

  Expected: PASS；8 个认证场景全部通过。

- [x] **Step 7: 接入前端认证 composable**

  在 `useAuthSession()` 增加：

  ```ts
  async function switchRole(role: PracticumRole) {
    const response = await $fetch<{ user: AuthUser }>('/api/auth/switch-role', {
      method: 'POST',
      headers: useCsrfHeaders(),
      body: { role },
    })
    state.value.user = response.user
    state.value.loaded = true
    return response.user
  }
  ```

  返回值中暴露 `switchRole`，异常时保留当前服务端身份并向调用者抛出错误。

- [ ] **Step 8: 类型检查并建立检查点**

  Run: `npm.cmd run typecheck`

  Expected: PASS，零 TypeScript 错误。

  Commit only: `docs/bdd/auth-session.feature.md tests/e2e/practicum/auth-session.spec.ts server/utils/auth-store.ts server/api/auth/switch-role.post.ts server/middleware/csrf.ts composables/useAuthSession.ts`

  Commit: `git commit -m "feat(auth): add authorized role switching"`

---

### Task 2: 共享 Header、Sidebar 与全局 Toast

**Files:**
- Modify: `tests/runtime/learnec-real-project-ui-contract.test.mjs`
- Modify: `tests/e2e/practicum/navigation-permissions.spec.ts`
- Modify: `tests/e2e/practicum/shell.spec.ts`
- Create: `composables/usePracticumToast.ts`
- Create: `components/practicum/PracticumToastHost.vue`
- Modify: `app.vue`
- Modify: `components/practicum/PracticumTopbar.vue`
- Modify: `components/practicum/PracticumSidebar.vue`
- Modify: `components/practicum/PracticumShell.vue`
- Modify: `assets/css/learnec-nuxt.css`

**Interfaces:**
- Consumes: Task 1 的 `authorizedRoles` 与 `auth.switchRole(role)`、现有通知和 workspace composables。
- Produces: 固定五项主导航、真实授权角色分段控件、固定五项管理侧栏、`usePracticumToast().push()`、全局 `PracticumToastHost`。

- [ ] **Step 1: 写静态 UI 合同 RED**

  断言 Topbar 源码同时包含五个导航标签和 `data-role-segment`；Sidebar 包含五个管理标签且不包含 `sidebar-foot` 或“教学管理”；App 挂载 `PracticumToastHost`。

  Run: `node --test tests/runtime/learnec-real-project-ui-contract.test.mjs`

  Expected: FAIL，指出缺失五项导航、角色分段控件和 Toast Host，且旧侧栏底卡仍存在。

- [ ] **Step 2: 写浏览器行为 RED**

  以 OWNER 登录，点击学生分段项后等待 `/api/auth/session` 返回 `STUDENT` 并显示学生首页；刷新后仍为学生。再验证 STUDENT 不显示未授权 OWNER 分段项，390px 页面无横向溢出。

  Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/navigation-permissions.spec.ts tests/e2e/practicum/shell.spec.ts`

  Expected: FAIL，现有顶栏没有真实分段控件且导航项不完整。

- [ ] **Step 3: 实现统一 Toast 状态和宿主**

  `usePracticumToast()` 使用 Nuxt `useState` 保存 `success | error | info` 消息，消息具有稳定 id、自动关闭定时器和手动 dismiss。Host 的成功/信息消息使用 `role="status"`，失败消息使用 `role="alert"`。

- [ ] **Step 4: 实现固定五项 Header 与授权角色分段控件**

  五项导航对所有已登录角色保持结构一致；未授权的管理控制台显示禁用语义。切换角色时调用 Task 1 接口，成功后重新加载 workspace 并导航到 `/practicum`，失败时通过 Toast 报错，不改变当前角色。

- [ ] **Step 5: 收敛管理 Sidebar**

  OWNER 导航只保留五项并删除 `.sidebar-foot`。教师保留其现有业务菜单，但使用同一选中态、图标尺寸和间距规则。

- [ ] **Step 6: GREEN、可访问性和移动端回归**

  Run: `node --test tests/runtime/learnec-real-project-ui-contract.test.mjs`

  Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/navigation-permissions.spec.ts tests/e2e/practicum/shell.spec.ts`

  Expected: PASS；桌面与 390px 均无横向溢出，键盘可操作身份分段项和菜单。

  Commit: `git commit -m "feat(ui): unify LearnEC navigation and feedback"`

---

### Task 3: 管理概览 Skeleton、四指标与数据库健康状态

**Files:**
- Modify: `tests/runtime/learnec-real-project-ui-contract.test.mjs`
- Create: `tests/e2e/practicum/health-api.spec.ts`
- Modify: `tests/e2e/practicum/admin-console-ui.spec.ts`
- Create: `server/api/practicum/health.get.ts`
- Modify: `composables/usePracticumServer.ts`
- Modify: `pages/practicum/index.vue`
- Modify: `assets/css/learnec-nuxt.css`

**Interfaces:**
- Consumes: `prisma`、`listRoomMembers()`、`listSubmissions()`、workspace room 数据、`getRoomOverview()`。
- Produces: `GET /api/practicum/health -> { database, latencyMs }`、`server.getHealth()`、管理员四指标与仪表盘 Skeleton。

- [ ] **Step 1: 写健康探针 RED**

  登录后请求 `/api/practicum/health`，断言状态为 200，`database` 只允许 `online | offline`，`latencyMs` 为非负数，响应文本不含 `DATABASE_URL`、`postgresql://`、`55432`、`stack`。未登录返回 401。

  Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/health-api.spec.ts`

  Expected: FAIL，接口尚不存在。

- [ ] **Step 2: 实现只读健康探针**

  路由先执行 `requireAuthenticatedUser(event)`，记录开始时间并执行 ``prisma.$queryRaw`SELECT 1` ``；成功返回 `online`，连接异常返回 HTTP 200 与 `offline`，禁止回传异常对象。

- [ ] **Step 3: 写管理员概览 UI RED**

  断言加载时存在 `data-admin-dashboard-skeleton`，完成后显示四个唯一 `data-admin-metric`：`students / rooms / reviews / completion`，存在 `data-database-health` 和六个真实快捷入口，页面不含“正在同步工作台”。

  Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/admin-console-ui.spec.ts`

  Expected: FAIL，当前仅有三项 strip 且使用居中加载提示。

- [ ] **Step 4: 重构概览为独立加载区域**

  保留完整页面框架并在数据未结算时渲染同尺寸 Skeleton。使用 `Promise.allSettled()` 独立读取成员、培训室、审核和 analytics；成功区照常显示，失败区显示 `--`、错误说明和重试按钮。完成率格式化为 `0%` 到 `100%`，不构造假数据。

- [ ] **Step 5: GREEN 和局部失败回归**

  Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/health-api.spec.ts tests/e2e/practicum/admin-console-ui.spec.ts`

  Expected: PASS；数据库不可用时健康卡显示离线，其他已成功指标仍保留。

  Commit: `git commit -m "feat(admin): add resilient LearnEC overview"`

---

### Task 4: 课程计划、审核与成绩分析视觉统一

**Files:**
- Modify: `tests/e2e/practicum/admin-console-ui.spec.ts`
- Modify: `tests/e2e/practicum/teacher-review.spec.ts`
- Modify: `tests/e2e/practicum/data-center-server-source.spec.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `components/practicum/AnalyticsChart.client.vue`
- Modify: `pages/practicum/plans/index.vue`
- Modify: `pages/practicum/reviews/index.vue`
- Modify: `pages/practicum/data-center.vue`
- Modify: `assets/css/learnec-nuxt.css`

**Interfaces:**
- Consumes: 现有 plans、class assignment、submissions、grade 和 analytics API。
- Produces: 稳定分类到 LearnEC 色块的映射、真实计划/审核卡片、懒加载 ECharts、图表文字摘要。

- [ ] **Step 1: 写三条页面合同 RED**

  计划卡按业务分类稳定映射橙/蓝/绿/紫 token；审核页保留版本、退回、打分和评语路径；数据中心从服务端 analytics 渲染图表，图表旁存在同数据文字摘要且空数据不生成柱形。

  Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/admin-console-ui.spec.ts tests/e2e/practicum/teacher-review.spec.ts tests/e2e/practicum/data-center-server-source.spec.ts`

  Expected: FAIL，现有页面尚未满足统一卡片和 ECharts 合同。

- [ ] **Step 2: 安装并锁定 ECharts**

  Run: `npm.cmd install echarts --save`

  Expected: `package.json` 与 `package-lock.json` 仅新增 ECharts 及其必要依赖。

- [ ] **Step 3: 实现客户端懒加载图表组件**

  `AnalyticsChart.client.vue` 在 `onMounted()` 中执行 `await import('echarts')`，监听容器尺寸，组件卸载时 `dispose()`。Props 只接收服务端已结算的标签和值，并输出 `aria-label` 和可见文字摘要。

- [ ] **Step 4: 统一三个管理页面**

  计划页复用 LearnEC 课程卡层级并保留发布、撤回、归档、排课和培训室绑定入口；审核页保留真实队列和详情操作；数据中心接入图表组件。所有写操作使用现有 CSRF helper，并通过全局 Toast 告知成功或失败。

- [ ] **Step 5: GREEN 与业务路径回归**

  Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/plans-api.spec.ts tests/e2e/practicum/class-assignments-api.spec.ts tests/e2e/practicum/teacher-review.spec.ts tests/e2e/practicum/data-center-server-source.spec.ts`

  Expected: PASS；API 状态机和页面交互均保持真实服务端来源。

  Commit: `git commit -m "feat(practicum): align management workflows with LearnEC"`

---

### Task 5: Docker 兼容、全量回归与验收截图

**Files:**
- Create: `tests/scripts/use-docker-postgres.test.ps1`
- Modify: `scripts/use-docker-postgres.ps1`
- Modify: `docs/acceptance-test-report.md`
- Update: `output/playwright/learnec-student-home.png`
- Update: `output/playwright/learnec-owner-home.png`

**Interfaces:**
- Consumes: `docker info`、`docker compose version`、`docker-compose.exe version`、现有 Playwright isolated runner。
- Produces: 快速失败的 Compose 选择逻辑、完整验收证据和学生/管理员最终截图。

- [ ] **Step 1: 写 Docker 选择逻辑 RED**

  用命令解析断言覆盖：引擎不可用时快速失败并提示启动 Docker Desktop；插件可用时使用 `docker compose`；仅独立程序可用时使用 `docker-compose.exe`；两者都不可用时给出明确安装提示。

  Run: `powershell -ExecutionPolicy Bypass -File tests/scripts/use-docker-postgres.test.ps1`

  Expected: FAIL，现有脚本无引擎预检和回退。

- [ ] **Step 2: 实现 Compose 检测和快速失败**

  先执行 `docker info`，再检测两种 Compose 命令并保存为脚本作用域调用器；只有端口未通时才执行 `up -d`。等待上限改为 45 秒，失败信息包含下一步，不删除或重置任何数据。

- [ ] **Step 3: 运行 Docker GREEN 与数据库状态检查**

  Run: `powershell -ExecutionPolicy Bypass -File tests/scripts/use-docker-postgres.test.ps1`

  Run: `npm.cmd run db:status`

  Expected: 脚本测试 PASS；环境未启动时 `db:status` 明确报告实际状态，不长时间挂起。

- [ ] **Step 4: 运行最终验证矩阵**

  Run: `node --test tests/runtime/learnec-real-project-ui-contract.test.mjs`

  Run: `npm.cmd run test:e2e:isolated -- tests/e2e/practicum/auth-session.spec.ts tests/e2e/practicum/navigation-permissions.spec.ts tests/e2e/practicum/admin-console-ui.spec.ts tests/e2e/practicum/teacher-review.spec.ts tests/e2e/practicum/data-center-server-source.spec.ts`

  Run: `npm.cmd run typecheck`

  Run: `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`

  Expected: 所有命令 exit 0，无失败测试和 TypeScript 错误。

- [ ] **Step 5: 捕获学生端与管理员端验收截图**

  使用项目 Playwright 配置在 1440x900 捕获真实登录后的 `/practicum`，覆盖：

  - `output/playwright/learnec-student-home.png`
  - `output/playwright/learnec-owner-home.png`

  截图前确认页面已结束 Skeleton、无错误 Toast、无水平溢出、字体和本地图片均加载完成。

- [ ] **Step 6: 更新验收报告并建立最终检查点**

  在 `docs/acceptance-test-report.md` 记录每个 BDD ID、RED 原因、GREEN 命令、退出码、截图路径、数据库实际状态和未验证项。

  Commit: `git commit -m "test(practicum): verify LearnEC unified workflows"`

---

## Plan Self-Review

- Spec coverage: 角色授权、五项 Header、五项管理 Sidebar、Toast、Skeleton、四指标、健康探针、计划/排课/审核/图表、Docker 兼容、移动端和双角色截图均有对应任务。
- Placeholder scan: 每项改动均给出具体文件、接口、测试命令和预期结果，没有未定义的实现占位。
- Type consistency: `authorizedRoles`、`activeRole`、`setSessionActiveRole()`、`switchRole()`、`getHealth()` 和 Toast 接口在首次出现处定义，后续任务只消费这些名字。
- Execution mode: 用户已要求在当前会话开始落地，因此从 Task 1 依次执行，每个任务保留独立 RED/GREEN 证据和提交边界。
