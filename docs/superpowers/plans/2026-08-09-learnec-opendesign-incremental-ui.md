# LearnEC Open Design Incremental UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变 LearnEC 路由、权限与 API 桥接的前提下，迁移 Open Design 的视觉 Token、核心组件与完整前端反馈。

**Architecture:** 共享 CSS 通过 Token 和既有语义类名覆盖。页面继续使用 `usePracticumServer`、`useAuthSession` 和 Nuxt 路由，只补充展示元数据与局部 Modal/Toast 状态。

**Tech Stack:** Nuxt 3、Vue 3 Composition API、TypeScript strict、CSS、Playwright。

## Global Constraints

- 页面底色为 `#F8FAFC`，主卡片为 `16px` 圆角，次级控件为 `12px` 圆角。
- 复用现有 API composable、角色权限和文件路由，不以 `$fetch` 绕过已有桥接。
- 每个交互元素必须跳转、改变状态、打开 Modal 或显示 Toast。
- 保留键盘焦点、语义标签、空状态及 `prefers-reduced-motion`。
- 不回退、删除或提交此任务无关的工作区改动。
- typecheck、build 或 Playwright 的同一条执行路径连续失败两次，立即停止自动修复，报告失败日志、相关文件和建议方案，等待人工确认。
- 每个已通过验证的模块必须单独提交；禁止通过删除已有功能或业务逻辑来规避测试失败。

---

### Task 1: 注入 Token 与共享微交互

**Files:** Modify `assets/css/main.css`, `assets/css/learnec-nuxt.css`; Test `tests/e2e/practicum/opendesign-ui-integration.spec.ts`.

**Interfaces:** 输出 `--learnec-shadow-soft`、`--learnec-shadow-soft-hover`、`--learnec-radius-card`、`.shadow-soft` 和 `.shadow-soft-hover`。

- [ ] **Step 1: 写入失败的 Token 测试**

```ts
test('[OPENDESIGN-UI-006] exported shell exposes soft design tokens', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')
  const tokens = await page.locator('body').evaluate(() => {
    const styles = getComputedStyle(document.documentElement)
    return { paper: styles.getPropertyValue('--practicum-paper').trim(), radius: styles.getPropertyValue('--learnec-radius-card').trim(), shadow: styles.getPropertyValue('--learnec-shadow-soft').trim() }
  })
  expect(tokens.paper).toBe('#F8FAFC')
  expect(tokens.radius).toBe('16px')
  expect(tokens.shadow).toContain('0 10px 30px -5px')
})
```

- [ ] **Step 2: 确认红灯**

Run: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4175'; npx playwright test -c playwright.opendesign.config.ts --grep OPENDESIGN-UI-006`

Expected: FAIL，因为 Token 尚未定义。

- [ ] **Step 3: 最小实现**

```css
:root { --practicum-paper:#F8FAFC; --learnec-radius-card:16px; --learnec-radius-control:12px; --learnec-shadow-soft:0 10px 30px -5px rgba(0,0,0,.05),0 4px 10px -2px rgba(0,0,0,.02); --learnec-shadow-soft-hover:0 20px 40px -10px rgba(0,0,0,.08),0 8px 16px -4px rgba(0,0,0,.04); --learnec-motion:.2s cubic-bezier(.4,0,.2,1); }
.shadow-soft { box-shadow:var(--learnec-shadow-soft); }
.course-card,.paper,.btn,.blue-btn { transition:transform var(--learnec-motion),box-shadow var(--learnec-motion),border-color var(--learnec-motion),background var(--learnec-motion); }
.course-card:hover,.interactive-card:hover { transform:translateY(-4px); box-shadow:var(--learnec-shadow-soft-hover); }
```

- [ ] **Step 4: 确认绿灯与提交**

Run: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4175'; npx playwright test -c playwright.opendesign.config.ts --grep OPENDESIGN-UI-006`

Expected: PASS。

Run: `git add assets/css/main.css assets/css/learnec-nuxt.css tests/e2e/practicum/opendesign-ui-integration.spec.ts; git commit -m "feat(practicum): add Open Design surface tokens"`

### Task 2: 顶栏、侧栏和 Hero 真正入口

**Files:** Modify `components/practicum/PracticumTopbar.vue`, `components/practicum/PracticumSidebar.vue`, `components/practicum/PracticumShell.vue`, `pages/practicum/index.vue`, `assets/css/learnec-nuxt.css`; Test `tests/e2e/practicum/opendesign-ui-integration.spec.ts`, `tests/e2e/practicum/home-hero-entry-ui.spec.ts`.

**Interfaces:** 消费现有导航、`primaryLearningRoute`、`currentPlanProgress` 与 `studentTasks`；输出 64px 顶栏、3px 选中线、`data-hero-status-badge`、`data-resume-card`、`data-todo-card`。

- [ ] **Step 1: 写入失败测试**

```ts
test('[OPENDESIGN-UI-007] shell and hero expose polished active and action states', async ({ page }) => {
  await loginAsStudent(page); await page.goto('/practicum')
  await expect(page.locator('[data-opendesign-topbar]')).toHaveCSS('height', '64px')
  await expect(page.locator('[data-hero-status-badge]')).toContainText('本周实训')
  await expect(page.locator('[data-resume-card] a')).toHaveAttribute('href', /\/practicum\/(learn|courses)/)
  await expect(page.locator('[data-todo-card] a')).toHaveAttribute('href', '/practicum/tasks')
})
```

- [ ] **Step 2: 确认红灯**

Run: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4175'; npx playwright test -c playwright.opendesign.config.ts --grep OPENDESIGN-UI-007`

Expected: FAIL，因为缺少状态卡选择器。

- [ ] **Step 3: 用现有数据实现 Hero 结构**

```vue
<div class="hero-badge" data-hero-status-badge><span class="dot" aria-hidden="true" /><span>本周实训 · 商品详情页优化</span></div>
<section class="resume-card shadow-soft" data-resume-card><div><span class="lbl">继续上次</span><h3>{{ primaryPlan?.title ?? '探索课程大厅' }}</h3><div class="track"><i :style="{ width: `${currentPlanProgress.percent}%` }" /></div></div><NuxtLink class="btn btn-primary btn-sm" :to="primaryLearningRoute">接着学</NuxtLink></section>
<section class="resume-card shadow-soft" data-todo-card><div><span class="lbl">待办</span><h3>{{ nextTaskSummary }}</h3></div><NuxtLink class="btn btn-ghost btn-sm" to="/practicum/tasks">去处理</NuxtLink></section>
```

顶栏使用 64px、3px 指示线和细边框头像；侧栏只在既有导航项上增加 `data-sidebar-item` 与蓝色左边线，保留全部现有跳转。

- [ ] **Step 4: 确认绿灯与提交**

Run: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4175'; npx playwright test -c playwright.opendesign.config.ts --grep OPENDESIGN-UI-007; npx playwright test tests/e2e/practicum/home-hero-entry-ui.spec.ts`

Expected: PASS。

Run: `git add components/practicum/PracticumTopbar.vue components/practicum/PracticumSidebar.vue components/practicum/PracticumShell.vue pages/practicum/index.vue assets/css/learnec-nuxt.css tests/e2e/practicum/opendesign-ui-integration.spec.ts; git commit -m "feat(practicum): refine shell and student hero"`

### Task 3: 六色课程卡与大厅筛选保真

**Files:** Modify `components/practicum/CourseCard.vue`, `pages/practicum/courses/index.vue`, `data/practicum/course-catalog.ts`, `assets/css/learnec-nuxt.css`; Test `tests/e2e/practicum/course-card-alignment.spec.ts`, `tests/e2e/practicum/opendesign-ui-integration.spec.ts`.

**Interfaces:** 消费 `Plan`、`catalogCourses`、`canLearn` 与 `canManage`；输出带类别、五星、状态胶囊和真实课程/学习链接的 `data-course-card`。

- [ ] **Step 1: 写入失败测试**

```ts
test('[OPENDESIGN-UI-008] course card renders catalog metadata and functional actions', async ({ page }) => {
  await loginAsStudent(page); await page.goto('/practicum/courses')
  const card = page.locator('[data-course-card]').first()
  await expect(card.locator('[data-course-category]')).toBeVisible()
  await expect(card.locator('[data-course-rating]')).toContainText('★')
  await expect(card.locator('[data-course-status]')).toBeVisible()
  await expect(card.locator('a')).toHaveCount(2)
})
```

- [ ] **Step 2: 确认红灯**

Run: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4175'; npx playwright test -c playwright.opendesign.config.ts --grep OPENDESIGN-UI-008`

Expected: FAIL，因为元数据选择器尚不存在。

- [ ] **Step 3: 增加六条展示元数据和 CSS 气泡**

```ts
export interface CoursePresentation { id:string; category:string; level:string; statusLabel:'实训计划'|'免费'|'进阶'; tone:'orange'|'blue'|'green'|'purple'; rating:number }
```

添加淘宝从零到精通、跨境电商实战、营销引流全攻略、数据分析增幅技巧、直播带货技巧、详情页优化方法六条数据。卡片使用 `data-course-category`、`data-course-rating`、`data-course-status`，所有 `NuxtLink` 维持既有详情和学习目标。

- [ ] **Step 4: 确认绿灯与提交**

Run: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4175'; npx playwright test -c playwright.opendesign.config.ts --grep OPENDESIGN-UI-008; npx playwright test tests/e2e/practicum/course-card-alignment.spec.ts tests/e2e/practicum/course-hall-ui.spec.ts`

Expected: PASS，桌面卡片对齐、移动端无横向溢出。

Run: `git add components/practicum/CourseCard.vue pages/practicum/courses/index.vue data/practicum/course-catalog.ts assets/css/learnec-nuxt.css tests/e2e/practicum/course-card-alignment.spec.ts tests/e2e/practicum/opendesign-ui-integration.spec.ts; git commit -m "feat(practicum): enrich course hall cards"`

### Task 4: 学员/管理指标和 Mock 交互

**Files:** Modify `components/practicum/LearnecStudentCenter.vue`, `pages/practicum/learnec-workbench.client.vue`, `assets/css/learnec-nuxt.css`; Test `tests/e2e/practicum/learnec-center-polish.spec.ts`, `tests/e2e/practicum/opendesign-ui-integration.spec.ts`.

**Interfaces:** 消费现有 progress、notifications、medals、计划、成员和审核数据；输出 `data-medal`、`data-metric-trend`、`data-mock-action`、`data-ui-toast`。

- [ ] **Step 1: 写入失败测试**

```ts
test('[OPENDESIGN-UI-009] medals, metrics and mock actions provide feedback', async ({ page }) => {
  await loginAsStudent(page); await page.goto('/center')
  await page.locator('[data-medal]').first().click()
  await expect(page.locator('[role="dialog"]')).toBeVisible()
  await loginAsOwner(page); await page.goto('/practicum/learnec-workbench')
  await expect(page.locator('[data-admin-metric] [data-metric-trend]')).toHaveCount(1)
  await page.locator('[data-mock-action]').first().click()
  await expect(page.locator('[data-ui-toast]')).toBeVisible()
})
```

- [ ] **Step 2: 确认红灯**

Run: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4175'; npx playwright test -c playwright.opendesign.config.ts --grep OPENDESIGN-UI-009`

Expected: FAIL，因为反馈选择器尚不存在。

- [ ] **Step 3: 最小实现 Mock 生命周期**

```ts
const toast = ref('')
const mockBusy = ref(false)
async function runMockAction(message: string) {
  mockBusy.value = true
  await new Promise(resolve => window.setTimeout(resolve, 350))
  mockBusy.value = false
  toast.value = message
  window.setTimeout(() => { toast.value = '' }, 2800)
}
```

勋章使用金银铜径向渐变和 `data-medal`，保留详情 Modal。变化指标输出 `data-metric-trend` 胶囊。只有“设计润色”“生成数据看板”等无 API 入口使用 `runMockAction`，已有 API 或路由不改为 Mock。

- [ ] **Step 4: 确认绿灯与提交**

Run: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4175'; npx playwright test -c playwright.opendesign.config.ts --grep OPENDESIGN-UI-009; npx playwright test tests/e2e/practicum/learnec-center-polish.spec.ts tests/e2e/practicum/admin-console-ui.spec.ts`

Expected: PASS，Modal 可关闭，Mock 有 loading 和 Toast。

Run: `git add components/practicum/LearnecStudentCenter.vue pages/practicum/learnec-workbench.client.vue assets/css/learnec-nuxt.css tests/e2e/practicum/learnec-center-polish.spec.ts tests/e2e/practicum/opendesign-ui-integration.spec.ts; git commit -m "feat(practicum): polish dashboard feedback states"`

### Task 5: 类型、构建、UI 路径与本地预览

**Files:** Modify `docs/acceptance-test-report.md`.

**Interfaces:** 消费所有新增 Token、选择器与真实路由，输出可审计验证记录和预览地址。

- [ ] **Step 1: 运行类型和构建验证**

Run: `npm run typecheck; npm run build`

Expected: 两个命令均以 exit code 0 结束。

- [ ] **Step 2: 运行关键 UI 路径**

Run: `npm run test:e2e:direct -- tests/e2e/practicum/opendesign-ui-integration.spec.ts tests/e2e/practicum/home-hero-entry-ui.spec.ts tests/e2e/practicum/course-card-alignment.spec.ts tests/e2e/practicum/learnec-center-polish.spec.ts tests/e2e/practicum/admin-console-ui.spec.ts`

Expected: 所有用例 PASS，桌面和移动端无横向溢出。

- [ ] **Step 3: 启动开发预览服务**

Run: `npm run dev:direct -- --host 127.0.0.1 --port 4174`

Expected: `http://127.0.0.1:4174/practicum/login` 可访问。

- [ ] **Step 4: 写入报告并提交**

```markdown
## 2026-08-09 Open Design 增量 UI 验证
- `npm run typecheck`: PASS
- `npm run build`: PASS
- Playwright 关键路径: PASS
- 本地预览: `http://127.0.0.1:4174/practicum/login`
```

Run: `git add docs/acceptance-test-report.md; git commit -m "docs(practicum): record UI migration verification"`
