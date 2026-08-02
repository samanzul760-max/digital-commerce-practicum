# 管理员成就观测页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让管理员在 `/practicum/achievements` 查看本实训室学生完成情况、六边形能力图、排名和可跳转的学生明细，同时保持学生个人成就页不变。

**Architecture:** 扩展已有成员分析聚合，让服务端一次返回班级概览、成员完成数据和最多六个能力维度；页面按真实会话角色选择管理员或学生视图。管理员页面只使用该接口，头像和姓名链接到现有的受保护成员详情路由。

**Tech Stack:** Nuxt 3、Vue 3 Composition API、TypeScript、H3、文件型 practicum repository、Playwright。

## Global Constraints

- 管理员统计只能来自 `/api/practicum/analytics/members`，不得使用 `usePracticumStore`、localStorage 或 seed 作为回退。
- 学生仅能查看自己的原有成就，不能读取成员分析接口或成员详情。
- 不新增侧边栏一级入口，不复制参考平台品牌、文案或私有接口。
- 雷达图使用内联 SVG，不增加图表依赖；窄屏无水平滚动。
- 保留当前工作区无关改动，不把它们纳入本切片提交。

---

## File Structure

- Modify: `server/utils/practicum-repository.ts` - 聚合管理员成就页需要的概览和六维能力数据。
- Modify: `composables/usePracticumServer.ts` - 声明并获取管理员成员成就汇总。
- Modify: `pages/practicum/achievements.vue` - 以真实角色切换管理员观测页和学生个人成就页。
- Modify: `assets/css/main.css` - 仅补充管理员成就页的响应式布局和雷达图样式。
- Create: `tests/e2e/practicum/admin-achievements.spec.ts` - 管理员、学生、跳转、空/错态和移动端验收。

### Task 1: 服务端成员成就汇总

**Files:**
- Modify: `server/utils/practicum-repository.ts:621-647`
- Modify: `composables/usePracticumServer.ts:38-59,153-157`
- Test: `tests/e2e/practicum/admin-achievements.spec.ts`

**Consumes:** `getMemberAnalytics(user, roomId)` 的 OWNER/room 授权、成员提交和已评分作业。

**Produces:**
```ts
type AdminAchievementAnalytics = {
  summary: { learnerCount: number; averageCompletionPercent: number; completedTaskCount: number; pendingReviewCount: number }
  items: Array<{ memberId: string; learnerLabel: string; completionPercent: number; gradedCount: number; avgScore: number }>
  skillDimensions: Array<{ skill: string; score: number }>
}
```

- [ ] **Step 1: Write the failing API test**

Create a Playwright API assertion using an authenticated OWNER:

```ts
test('owner member achievement analytics includes server-derived summary and six dimensions', async ({ page }) => {
  await loginAsOwner(page)
  const response = await page.request.get('/api/practicum/analytics/members?roomId=room-001')
  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual(expect.objectContaining({
    summary: expect.objectContaining({ learnerCount: expect.any(Number), averageCompletionPercent: expect.any(Number), completedTaskCount: expect.any(Number), pendingReviewCount: expect.any(Number) }),
    items: expect.any(Array),
    skillDimensions: expect.any(Array),
  }))
})
```

- [ ] **Step 2: Run the API test and verify RED**

Run:

```powershell
npx.cmd playwright test tests/e2e/practicum/admin-achievements.spec.ts --grep "server-derived summary" --reporter=list
```

Expected: FAIL because the current response contains only `items`.

- [ ] **Step 3: Extend the repository aggregation**

Keep authorization unchanged. Derive all fields from the room-scoped submissions; add a six-item `skillDimensions` list from graded practice rubrics, sorted by average score and padded only with `{ skill: '暂无评分维度', score: 0 }` to preserve the six-axis visualization without inventing learner performance.

```ts
return clone({
  summary: {
    learnerCount: rows.length,
    averageCompletionPercent: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.completionPercent, 0) / rows.length) : 0,
    completedTaskCount: rows.reduce((sum, row) => sum + row.gradedCount, 0),
    pendingReviewCount: submissions.filter(submission => submission.status === 'SUBMITTED').length,
  },
  items: rows,
  skillDimensions,
})
```

Declare the returned type in `usePracticumServer.ts` and add:

```ts
async function listMemberAchievementAnalytics(roomId: string) {
  return await $fetch<AdminAchievementAnalytics>(`/api/practicum/analytics/members?roomId=${encodeURIComponent(roomId)}`)
}
```

- [ ] **Step 4: Run the API test and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add server/utils/practicum-repository.ts composables/usePracticumServer.ts tests/e2e/practicum/admin-achievements.spec.ts
git commit -m "feat(practicum): expose admin achievement analytics"
```

### Task 2: 管理员成就页与成员详情入口

**Files:**
- Modify: `pages/practicum/achievements.vue`
- Modify: `assets/css/main.css`
- Test: `tests/e2e/practicum/admin-achievements.spec.ts`

**Consumes:** `listMemberAchievementAnalytics(roomId)` from Task 1 and the existing `/practicum/member-data/:memberId` route.

**Produces:** `data-admin-achievements-page`, `data-achievement-radar`, `data-achievement-ranking`, `data-achievement-member-list` and clickable `data-achievement-member-link` elements.

- [ ] **Step 1: Write failing role-aware page tests**

Add tests that use real login helpers:

```ts
test('owner sees class achievement observability instead of the student-only prompt', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum/achievements')
  await expect(page.locator('[data-admin-achievements-page]')).toBeVisible()
  await expect(page.locator('[data-achievement-radar]')).toBeVisible()
  await expect(page.locator('[data-achievement-ranking]')).toBeVisible()
  await expect(page.locator('[data-achievement-member-list]')).toBeVisible()
  await expect(page.getByText('成就仅向学生视图开放')).toHaveCount(0)
})

test('owner opens the selected student completion detail from ranking', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum/achievements')
  const member = page.locator('[data-achievement-member-link]').first()
  await member.click()
  await expect(page).toHaveURL(/\/practicum\/member-data\//)
  await expect(page.locator('[data-member-data-page]')).toBeVisible()
})

test('student keeps the private achievement view', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/achievements')
  await expect(page.locator('[data-achievements-page]')).toBeVisible()
  await expect(page.locator('[data-admin-achievements-page]')).toHaveCount(0)
})
```

- [ ] **Step 2: Run page tests and verify RED**

Run:

```powershell
npx.cmd playwright test tests/e2e/practicum/admin-achievements.spec.ts --grep "observability|selected student|private achievement" --reporter=list
```

Expected: OWNER test fails because current page renders the student-only forbidden panel.

- [ ] **Step 3: Implement the role-aware page**

In `achievements.vue`, keep the current student markup in a `v-else-if="activeRole === 'STUDENT'"` branch. Add OWNER state with `onMounted` loading `server.listMemberAchievementAnalytics(currentRoomId)`.

Render six `polygon` spokes/grid lines and a data polygon computed from `skillDimensions`:

```ts
const radarPoints = computed(() => analytics.value?.skillDimensions.map((item, index) => {
  const angle = -Math.PI / 2 + index * Math.PI / 3
  const radius = 84 * item.score / 100
  return `${120 + Math.cos(angle) * radius},${120 + Math.sin(angle) * radius}`
}).join(' ') ?? '')
```

Render ranking and completion rows from `analytics.items`. Each row must use:

```vue
<NuxtLink :to="`/practicum/member-data/${member.memberId}`" data-achievement-member-link>
  <span class="achievement-avatar">{{ member.learnerLabel.slice(-2) }}</span>
  <strong>{{ member.learnerLabel }}</strong>
</NuxtLink>
```

On API failure show `PracticumStatePanel` with `data-admin-achievements-error`; on an empty `items` array show `data-admin-achievements-empty`. Do not use store fallback in the OWNER branch.

Add desktop grid and a single-column `@media (max-width: 780px)` layout in `assets/css/main.css`; constrain the SVG with `max-width: 100%` and `aspect-ratio: 1`.

- [ ] **Step 4: Run page tests and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```powershell
git add pages/practicum/achievements.vue assets/css/main.css tests/e2e/practicum/admin-achievements.spec.ts
git commit -m "feat(practicum): add role-aware achievement observability"
```

### Task 3: 异常态、移动端和回归验证

**Files:**
- Modify: `tests/e2e/practicum/admin-achievements.spec.ts`
- Modify: `pages/practicum/achievements.vue` only if tests expose a state-handling defect

**Consumes:** completed Tasks 1 and 2.

**Produces:** verified no-fallback behavior for empty/error responses and responsive manager view.

- [ ] **Step 1: Write failing resilience tests**

```ts
test('owner sees an error state rather than local achievement data when analytics fails', async ({ page }) => {
  await loginAsOwner(page)
  await page.route('**/api/practicum/analytics/members?roomId=room-001', route => route.fulfill({ status: 500, body: '{}' }))
  await page.goto('/practicum/achievements')
  await expect(page.locator('[data-admin-achievements-error]')).toBeVisible()
  await expect(page.locator('[data-achievement-member-list]')).toHaveCount(0)
})

test('owner achievement observability fits a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAsOwner(page)
  await page.goto('/practicum/achievements')
  await expect(page.locator('[data-admin-achievements-page]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
```

- [ ] **Step 2: Run resilience tests and verify RED**

Run:

```powershell
npx.cmd playwright test tests/e2e/practicum/admin-achievements.spec.ts --grep "error state|390px" --reporter=list
```

Expected: FAIL before the error-state selector and responsive constraints exist.

- [ ] **Step 3: Implement only the missing state or responsive constraints**

Use `PracticumStatePanel` for the error selector and ensure the CSS below exists:

```css
@media (max-width: 780px) {
  .admin-achievement-overview { grid-template-columns: 1fr; }
  .achievement-member-table { min-width: 0; }
  .achievement-member-row { grid-template-columns: minmax(0, 1fr) auto; }
}
```

- [ ] **Step 4: Run resilience tests and verify GREEN**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 5: Run feature and project quality gates**

```powershell
npx.cmd playwright test tests/e2e/practicum/admin-achievements.spec.ts tests/e2e/practicum/achievements.spec.ts tests/e2e/practicum/analytics-member-page.spec.ts tests/e2e/practicum/analytics-member-skill-map-api.spec.ts --reporter=list
npm.cmd run typecheck
npm.cmd run build
```

Expected: all selected Playwright scenarios pass, typecheck exits 0, and build exits 0. Report a database/environment failure exactly as observed; do not call it a code failure without evidence.

- [ ] **Step 6: Commit Task 3**

```powershell
git add tests/e2e/practicum/admin-achievements.spec.ts pages/practicum/achievements.vue assets/css/main.css
git commit -m "test(practicum): cover admin achievement observability"
```
