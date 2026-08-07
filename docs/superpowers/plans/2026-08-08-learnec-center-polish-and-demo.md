# LearnEC 学员中心打磨与演示用例实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提供正式 `/center` 学员中心，接入真实会话与学习数据，并在真实记录为空时显示明确标注的只读演示用例。

**Architecture:** 新增 `LearnecStudentCenter` 组件和 `/center` 路由，复用认证、通知、课程与进度读取接口。顶栏的“学员中心”进入 `/center`；演示对象仅用于展示，永不参与进度、提交、评分或权限判断。

**Tech Stack:** Nuxt 3、Vue 3、TypeScript、Playwright、`useAuthSession`、`usePracticumServer`。

## Global Constraints

- 真实服务端数据优先；接口失败显示错误与重试，不能用演示内容掩盖失败。
- 所有演示内容显示“演示内容”，不能调用写入、提交、评分或角色切换接口。
- 角色切换复用 `POST /api/auth/switch-role`；授权集合由服务端会话决定。
- 头像菜单提供账号设置、授权角色切换、可选培训室切换、退出登录及既有通知入口。
- 顶部导航使用 14px 至 15px、500 字重、至少 24px 间距；正文不小于 14px，禁止负字距。
- 390px 与 1440px 下无横向滚动、遮挡或不可点击控件。
- 不覆盖现有未提交改动；不部署、不重置数据、不伪造真实进度或成绩。

---

### Task 1: 演示数据和行为合同

**Files:**
- Create: `composables/useLearnecCenterDemo.ts`
- Create: `tests/e2e/practicum/learnec-center-polish.spec.ts`

**Interfaces:**
- Produces: `LearnecCenterDemoCase`、`learnecCenterDemoCases`、`learnecCenterDemoAchievements`。

- [ ] **Step 1: 写失败的浏览器测试**

```ts
test('[CENTER-001] center exposes labeled demo cases when real progress is empty', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/center')
  await expect(page.locator('[data-personal-entry]')).toBeVisible()
  await expect(page.locator('[data-center-demo-case]')).toHaveCount(3)
  await expect(page.locator('[data-center-demo-case]').first()).toContainText('演示内容')
})
```

- [ ] **Step 2: 验证 RED**

Run: `npm.cmd exec playwright test tests/e2e/practicum/learnec-center-polish.spec.ts --config playwright.opendesign.config.ts --reporter=list`

Expected: FAIL，因为 `/center` 与演示卡定位符尚不存在。

- [ ] **Step 3: 实现纯数据模块**

`LearnecCenterDemoCase` 包含 `id`、`label`、`title`、`location`、`description`、`status`、`actionLabel`、`to`。数组固定包含下列三条：

```ts
{ id: 'title-optimization', label: '演示内容', title: '商品标题优化', location: '我的课程', description: '查看课程进度、学习目标和下一节内容。', status: '进行中', actionLabel: '继续学习', to: '/practicum/courses' }
{ id: 'shop-diagnosis', label: '演示内容', title: '店铺首页诊断', location: '模拟店铺', description: '查看店铺任务、问题清单和处理状态。', status: '待诊断', actionLabel: '查看诊断', to: '/practicum/shop/products' }
{ id: 'detail-materials', label: '演示内容', title: '详情页素材方案', location: '作业 / 作品集', description: '查看提交状态、反馈摘要和版本信息。', status: '待提交', actionLabel: '查看作品', to: '/practicum/tasks' }
```

- [ ] **Step 4: 提交本单元**

Run: `git add composables/useLearnecCenterDemo.ts tests/e2e/practicum/learnec-center-polish.spec.ts; git commit -m "test(practicum): define center demo behavior"`

### Task 2: 顶栏账号菜单与字体密度

**Files:**
- Modify: `components/practicum/PracticumTopbar.vue`
- Modify: `assets/css/learnec-nuxt.css`
- Modify: `tests/e2e/practicum/shell.spec.ts`

**Interfaces:**
- Consumes: `useAuthSession().switchRole(role)`、`workspace.selectRoom(roomId)`、`auth.logout()`。
- Produces: `[data-personal-entry]`、`[data-profile-dropdown]`、`[data-profile-role-option]`。

- [ ] **Step 1: 写失败测试并运行 RED**

```ts
test('[CENTER-002] avatar menu exposes account settings and authorized role switching', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/center')
  await page.locator('[data-personal-entry]').click()
  await expect(page.locator('[data-profile-dropdown]')).toBeVisible()
  await expect(page.locator('[data-profile-dropdown]')).toContainText('账号设置')
  await expect(page.locator('[data-profile-role-option="STUDENT"]')).toBeVisible()
  await expect(page.locator('[data-logout]')).toBeVisible()
})
```

Run: `npm.cmd exec playwright test tests/e2e/practicum/shell.spec.ts --config playwright.opendesign.config.ts --reporter=list`

Expected: FAIL，因为个人菜单没有可定位的授权身份入口。

- [ ] **Step 2: 实现与验证 GREEN**

在既有个人菜单中循环 `authorizedRoles`，角色按钮写 `data-profile-role-option` 并调用 `activateRole(role, '/center')`。账号设置、培训室与退出登录保持现有行为。CSS 只修改 `.top`、`.tabs`、`.top-profile` 和移动端规则：导航 14px、500 字重、24px 间距，720px 以下隐藏姓名。

Run: 同 Step 1。

Expected: PASS；OWNER 可切换 STUDENT，STUDENT 不看到未授权身份。

- [ ] **Step 3: 提交本单元**

Run: `git add components/practicum/PracticumTopbar.vue assets/css/learnec-nuxt.css tests/e2e/practicum/shell.spec.ts; git commit -m "feat(practicum): polish account menu and topbar spacing"`

### Task 3: 正式中心页面与真实数据回退

**Files:**
- Create: `components/practicum/LearnecStudentCenter.vue`
- Create: `pages/center.vue`
- Modify: `components/practicum/PracticumTopbar.vue`
- Modify: `assets/css/learnec-nuxt.css`
- Modify: `tests/e2e/practicum/learnec-center-polish.spec.ts`

**Interfaces:**
- Consumes: `learnecCenterDemoCases`、`getProgress()`、`listPlans()`、`listNotifications()`、`PracticumShell`。
- Produces: `[data-learnec-center]`、`[data-center-real-progress]`、`[data-center-demo-cases]`、`[data-center-demo-case]`、`[data-center-load-error]`。

- [ ] **Step 1: 写失败场景与验证 RED**

```ts
test('[CENTER-003] a server error is not replaced by demo progress', async ({ page }) => {
  await page.route('**/api/practicum/progress**', route => route.abort('failed'))
  await loginAsStudent(page)
  await page.goto('/center')
  await expect(page.locator('[data-center-load-error]')).toBeVisible()
  await expect(page.locator('[data-center-demo-cases]')).toHaveCount(0)
})

test('[CENTER-004] center has no horizontal overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAsStudent(page)
  await page.goto('/center')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
```

Run: `npm.cmd exec playwright test tests/e2e/practicum/learnec-center-polish.spec.ts --config playwright.opendesign.config.ts --reporter=list`

Expected: FAIL，因为组件、路由和状态定位符尚未实现。

- [ ] **Step 2: 实现数据层级**

`LearnecStudentCenter.vue` 在 `PracticumShell` 中展示欢迎区、三项真实指标、真实课程进度、通知和最近任务。读取失败时仅显示可重试错误；读取成功且 `progress.plans.length === 0` 时展示三张只读演示卡；真实计划存在时只展示真实进度。`pages/center.vue` 只渲染该组件；顶栏“学员中心”链接改为 `/center`。

- [ ] **Step 3: 实现六个入口与验证 GREEN**

侧栏固定 `概况 / 我的课程 / 模拟店铺 / 作业 / 作品集 / 成就`。入口跳转既有 `/practicum/*` 真实路由或显示对应演示说明；作品集只跳转任务查看，禁止新增假提交接口。

Run: 同 Step 1。

Expected: PASS；真实进度优先、空数据才展示三张演示卡、接口错误不展示演示卡。

- [ ] **Step 4: 提交本单元**

Run: `git add components/practicum/LearnecStudentCenter.vue pages/center.vue components/practicum/PracticumTopbar.vue assets/css/learnec-nuxt.css tests/e2e/practicum/learnec-center-polish.spec.ts; git commit -m "feat(practicum): add functional LearnEC student center"`

### Task 4: 整体验收与截图

**Files:**
- Modify: `docs/acceptance-test-report.md`
- Create: `output/playwright/learnec-center-desktop.png`
- Create: `output/playwright/learnec-center-mobile.png`

- [ ] **Step 1: 页面回归**

Run: `npm.cmd exec playwright test tests/e2e/practicum/learnec-center-polish.spec.ts tests/e2e/practicum/shell.spec.ts --config playwright.opendesign.config.ts --reporter=list`

Expected: PASS，覆盖菜单、演示回退、错误状态和移动端。

- [ ] **Step 2: 类型与构建检查**

Run: `npm.cmd run typecheck`

Run: `$env:NUXT_IGNORE_LOCK='1'; npm.cmd run build`

Expected: 两个命令均 exit 0。

- [ ] **Step 3: 截图与报告**

用 Playwright 在 1440x900 与 390x844 打开登录后的 `/center`，保存两张截图；验收报告记录命令、结果、截图路径和未验证项后，只提交本任务文件。

## Plan Self-Review

- Spec coverage: 菜单、角色切换、字体密度、真实数据优先、演示回退、六个入口、错误状态和双视口验收均有对应任务。
- Placeholder scan: 没有 TBD、TODO 或待定实现；每个代码任务都有文件、行为与 RED/GREEN 命令。
- Type consistency: 演示模块只导出只读对象；页面只消费读取接口；身份切换沿用 `auth.switchRole()`。
