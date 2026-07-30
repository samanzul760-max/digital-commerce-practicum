# 管理员控制台 UI 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变认证、权限、路由和真实数据来源的前提下，统一管理员控制台、学生工作台与登录入口的视觉语言，并完成管理员首页的可用重构。

**Architecture:** 保持 `PracticumShell.vue` 作为唯一共享壳层，侧栏和顶部栏只重写表现层而不改变导航定义与菜单行为。`pages/practicum/index.vue` 继续从 `usePracticumStore()` 获取计划与审核队列，并新增仅用于呈现的实时指标、审核提示与动态列表标记。

**Tech Stack:** Nuxt 3、Vue 3 Composition API、TypeScript、全局 CSS Tokens、Playwright（Microsoft Edge）。

## Global Constraints

- 未登录用户继续由现有中间件前往 `/practicum/login`；登录页不出现在登录后导航中。
- 仅保留真实管理员导航：总览、教学、案例、教学管理、数据；学生不能看到管理员入口。
- 所有容器、卡片、输入和按钮使用 `14px` 圆角，空间使用 `8px` 节奏。
- 指标和审核数只取真实 store 数据；不显示没有数据依据的增长率或趋势。
- 不修改 `szmy2`，不增加依赖，不改变 API、权限判断和数据模型。

---

### Task 1: 写入管理员视觉验收测试

**Files:**
- Modify: `tests/e2e/practicum/ui-baseline.spec.ts`

**Interfaces:**
- Consumes: `/practicum/profile` 角色选择、`[data-owner-home]`、`[data-practicum-sidebar]`。
- Produces: `ORIGINAL-S1-002` 管理员壳层与总览的回归保护。

- [ ] **Step 1: 创建 BDD 骨架并运行骨架检查。**

```ts
// Given an Owner has entered the workspace
// When the administrator overview renders
// Then it exposes the refined shell, real operational cards and management actions
test.skip('[ORIGINAL-S1-002] owner workspace uses the refined administration UI', async () => {})
```

- [ ] **Step 2: 将骨架替换为失败测试。**

```ts
await expect(page.locator('[data-owner-home] [data-admin-metric]')).toHaveCount(4)
await expect(page.locator('[data-owner-home] [data-review-summary]')).toBeVisible()
await expect(page.locator('[data-owner-home] [data-activity-feed]')).toBeVisible()
await expect(page.locator('[data-practicum-sidebar] .product-sign')).toHaveCount(0)
```

- [ ] **Step 3: 运行测试并确认 RED。**

Run: `npx playwright test tests/e2e/practicum/ui-baseline.spec.ts --grep ORIGINAL-S1-002`

- [ ] **Step 4: 实现最小可见 UI 并重新运行测试。**

Run: `npx playwright test tests/e2e/practicum/ui-baseline.spec.ts --grep ORIGINAL-S1-002`

### Task 2: 重构共享侧栏、顶部栏和全局视觉令牌

**Files:**
- Modify: `components/practicum/PracticumSidebar.vue`
- Modify: `components/practicum/PracticumTopbar.vue`
- Modify: `components/practicum/PracticumShell.vue`
- Modify: `assets/css/main.css`

**Interfaces:**
- Consumes: `visibleNavItems()`、现有通知与个人菜单状态、`data-*` 测试选择器。
- Produces: 深海蓝侧栏、14px 选中态、白色顶部栏、8px 间距令牌和窄屏无溢出布局。

- [ ] **Step 1: 保留 `NuxtLink`、现有 data 属性和权限过滤，只删除侧栏实心缩写图标。**

```vue
<div class="product-mark">
  <span class="product-glyph" aria-hidden="true"><PracticumIcon name="dashboard" /></span>
  <span><strong>数字商贸实训</strong><small>教学与实训协同平台</small></span>
</div>
```

- [ ] **Step 2: 将令牌收敛到 14px 半径、柔和阴影和 8px 间距，避免使用显眼灰黑描边。**

```css
:root {
  --practicum-radius-sm: 14px;
  --practicum-radius-md: 14px;
  --practicum-shadow-1: 0 12px 30px rgba(15, 23, 42, .08);
}
```

- [ ] **Step 3: 将选中导航实现为半透明浅蓝卡片与细亮色指示条，手机端保持深海蓝导航。**

```css
.workspace-sidebar .nav-item-active {
  position: relative;
  color: #fff;
  background: rgba(99, 179, 237, .18);
  border-radius: 14px;
}
.workspace-sidebar .nav-item-active::before { display:block; width:3px; background:#7dd3fc; }
```

- [ ] **Step 4: 检查通知、个人菜单、键盘 Escape 和角色切换仍保持原有行为。**

Run: `npx playwright test tests/e2e/practicum/shell.spec.ts tests/e2e/practicum/role-consolidation.spec.ts`

### Task 3: 重构管理员首页的真实数据展示

**Files:**
- Modify: `pages/practicum/index.vue`
- Modify: `assets/css/main.css`

**Interfaces:**
- Consumes: `store.state.plans`、`store.getReviewQueue()`、已有计划路由与提交详情路由。
- Produces: 四张真实指标卡、课程管理表格、浅橙审核提醒和最新实操动态列表。

- [ ] **Step 1: 从现有 store 计算指标，禁止硬编码增长率。**

```ts
const ownerMetrics = computed(() => [
  { label: '教学计划', value: store.state.plans.length, detail: '实时数据', icon: 'book', tone: 'blue' },
  { label: '待审核作业', value: reviewQueueCount.value, detail: '需要处理', icon: 'clipboard-check', tone: 'amber' },
  { label: '实操完成率', value: `${completionRate.value}%`, detail: '已发布任务', icon: 'trending-up', tone: 'green' },
  { label: '课程活动数', value: activityCount.value, detail: '当前计划', icon: 'layers', tone: 'violet' },
])
```

- [ ] **Step 2: 为每张卡添加稳定选择器和语义图标容器。**

```vue
<article v-for="metric in ownerMetrics" :key="metric.label" data-admin-metric class="admin-metric-card">
  <span class="metric-icon" :data-tone="metric.tone"><PracticumIcon :name="metric.icon" /></span>
  <span class="metric-label">{{ metric.label }}</span>
  <strong>{{ metric.value }}</strong>
  <small>{{ metric.detail }}</small>
</article>
```

- [ ] **Step 3: 将审核区域变为白底浅橙提醒，并使用现有提交详情链接。**

```vue
<section data-review-summary class="audit-card">
  <span class="status-pill status-pill-orange">待审核 {{ reviewQueueCount }} 项</span>
  <NuxtLink v-if="firstReview" :to="`/practicum/submissions/${firstReview.submissionId}`" class="primary-button">进入审核</NuxtLink>
</section>
```

- [ ] **Step 4: 根据审核队列生成动态列表；无数据时复用明确空状态。**

```vue
<section data-activity-feed class="activity-card">
  <div v-for="item in recentReviewActivity" :key="item.submissionId" class="activity-feed-row">...</div>
  <p v-if="!recentReviewActivity.length" class="empty-state">暂无新的实操动态</p>
</section>
```

- [ ] **Step 5: 运行管理员测试并确认所有真实跳转仍可用。**

Run: `npx playwright test tests/e2e/practicum/ui-baseline.spec.ts tests/e2e/practicum/teacher-review.spec.ts`

### Task 4: 响应式视觉验收与完整回归

**Files:**
- Modify: `tests/e2e/practicum/ui-baseline.spec.ts`
- Create: `output/playwright/admin-console-refresh-desktop.png`
- Create: `output/playwright/admin-console-refresh-mobile.png`

**Interfaces:**
- Consumes: 管理员首页、共享壳层、现有 Playwright 设置。
- Produces: 1440px 和 375px 截图、无横向溢出检查、构建验证。

- [ ] **Step 1: 增加桌面和移动端无水平溢出断言。**

```ts
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
expect(overflow).toBeFalsy()
```

- [ ] **Step 2: 截取 1440x900 与 375x812 管理员首页，并人工检查布局。**

Run: `npx playwright test tests/e2e/practicum/ui-baseline.spec.ts --grep ORIGINAL-S1-002`

- [ ] **Step 3: 运行项目质量检查。**

Run: `npm run typecheck`

Run: `npx playwright test tests/e2e/practicum`

Run: `npm run build`

- [ ] **Step 4: 更新完成矩阵中的 ORIGINAL-S1-002 证据。**

```markdown
| 管理员壳层视觉重构 | green | `ORIGINAL-S1-002`; `ui-baseline.spec.ts`; 1440/375 截图；typecheck、E2E、build 通过 |
```
