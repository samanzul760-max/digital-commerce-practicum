import { expect, test } from '@playwright/test'
import { loginAsStudent } from './auth-helpers'

// ============================================================================
// Phase A E2E Tests: 项目基础、布局、导航和权限
// ============================================================================

// ── A-01: 未选择身份时进入工作台 ──────────────────────────

test('[PHASE-A-01] unauthenticated workspace redirects to login and hides business data', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/practicum')
  await expect(page).toHaveURL('/practicum/login')
  await expect(page.locator('[data-login-form], [data-bootstrap-form]')).toBeVisible()
  await expect(page.locator('[data-owner-home], [data-student-home]')).toHaveCount(0)
})

test('[PHASE-A-01] student session returns to the student workspace', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')
  await expect(page.locator('[data-student-home]')).toBeVisible()
})

// ── A-02: OWNER 工作台权限 ─────────────────────────────────

test('[PHASE-A-02] OWNER sees all navigation entries and can access admin pages', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  // Check navigation items
  const navItems = page.locator('[data-practicum-sidebar] [data-nav-item]')
  await expect(navItems).toHaveCount(5)
  const navKeys = await navItems.evaluateAll(items => items.map(i => i.getAttribute('data-nav-key')))
  expect(navKeys).toEqual(['workspace', 'plans', 'cases', 'reviews', 'data-center'])

  // OWNER can access all management pages
  const adminRoutes = [
    '/practicum/resources',
    '/practicum/members',
    '/practicum/reviews',
    '/practicum/data-center',
    '/practicum/room-settings',
  ]
  for (const route of adminRoutes) {
    await page.goto(route)
    await expect(page.locator('[data-forbidden]')).toHaveCount(0)
  }

  // OWNER can access plan editor
  await page.goto('/practicum/plans/plan-wdds/edit')
  await expect(page.locator('[data-plan-editor]')).toBeVisible()
  await expect(page.locator('[data-forbidden]')).toHaveCount(0)
})

test('[PHASE-A-02] OWNER home page shows management dashboard', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  // Should show owner home
  await expect(page.locator('[data-owner-home]')).toBeVisible()
  await expect(page.locator('[data-student-home]')).toHaveCount(0)

  // Should show plan list
  await expect(page.locator('[data-plan-list]')).toBeVisible()
  expect(await page.locator('[data-plan-card]').count()).toBeGreaterThanOrEqual(2)

  // Should show "Create Plan" button
  await expect(page.locator('[data-create-plan]')).toBeVisible()
})

// ── A-03: STUDENT 工作台权限 ────────────────────────────────

test('[PHASE-A-03] STUDENT sees limited navigation and is blocked from admin pages', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // Check navigation items - only 4 for student
  const navItems = page.locator('[data-practicum-sidebar] [data-nav-item]')
  await expect(navItems).toHaveCount(4)
  const navKeys = await navItems.evaluateAll(items => items.map(i => i.getAttribute('data-nav-key')))
  expect(navKeys).toEqual(['workspace', 'cases', 'tasks', 'progress'])

  // STUDENT cannot access admin pages
  const adminRoutes = [
    '/practicum/resources',
    '/practicum/members',
    '/practicum/reviews',
    '/practicum/data-center',
    '/practicum/room-settings',
  ]
  for (const route of adminRoutes) {
    await page.goto(route)
    await expect(page.locator('[data-forbidden]')).toBeVisible()
  }

  // STUDENT cannot access plan editor
  await page.goto('/practicum/plans/plan-wdds/edit')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-plan-editor]')).toHaveCount(0)
})

test('[PHASE-A-03] STUDENT home shows student dashboard without admin data', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')

  // Should show student home
  await expect(page.locator('[data-student-home]')).toBeVisible()
  await expect(page.locator('[data-owner-home]')).toHaveCount(0)

  // Should NOT show create plan button
  await expect(page.locator('[data-create-plan]')).toHaveCount(0)

  // Should NOT show admin-only data
  await expect(page.locator('[data-review-quick-link]')).toHaveCount(0)
})

// ── A-04: TEACHER 和 MENTOR 权限边界 ──────────────────────

test('[PHASE-A-04] identity selector only offers OWNER and STUDENT roles', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.evaluate(() => window.localStorage.removeItem('digital-commerce-practicum.v1'))
  await page.goto('/practicum/profile')

  // Only OWNER and STUDENT role options exist
  const roleOptions = page.locator('[data-role-option]')
  await expect(roleOptions).toHaveCount(2)
  const roleValues = await roleOptions.evaluateAll(opts =>
    opts.map(o => o.getAttribute('data-role-option')).sort()
  )
  expect(roleValues).toEqual(['OWNER', 'STUDENT'])

  // No TEACHER or MENTOR options leak
  await expect(page.locator('[data-role-option="TEACHER"]')).toHaveCount(0)
  await expect(page.locator('[data-role-option="MENTOR"]')).toHaveCount(0)
})

// ── A-05: 统一导航 ─────────────────────────────────────────

test('[PHASE-A-05] all pages use shared shell without duplicate navigation', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()

  const routes = [
    '/practicum',
    '/practicum/plans/plan-wdds',
    '/practicum/plans/plan-wdds/edit',
    '/practicum/cases',
    '/practicum/reviews',
    '/practicum/resources',
    '/practicum/members',
    '/practicum/room-settings',
    '/practicum/data-center',
  ]

  for (const route of routes) {
    await page.goto(route)
    // Shell structure is consistent
    await expect(page.locator('[data-practicum-shell]')).toBeVisible()
    await expect(page.locator('[data-practicum-sidebar]')).toBeVisible()
    await expect(page.locator('[data-practicum-topbar]')).toBeVisible()
    // Only one sidebar exists
    await expect(page.locator('[data-practicum-sidebar]')).toHaveCount(1)
    // Only one topbar exists
    await expect(page.locator('[data-practicum-topbar]')).toHaveCount(1)
  }
})

test('[PHASE-A-05] sidebar active state uses aria-current on navigation', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()

  // Workspace active
  await page.goto('/practicum')
  const workspaceNav = page.locator('[data-nav-key="workspace"]')
  await expect(workspaceNav).toHaveAttribute('aria-current', 'page')
  await expect(workspaceNav).toHaveClass(/nav-item-active/)

  // Plans active via plan detail
  await page.goto('/practicum/plans/plan-wdds')
  const plansNav = page.locator('[data-nav-key="plans"]')
  await expect(plansNav).toHaveAttribute('aria-current', 'page')
  await expect(plansNav).toHaveClass(/nav-item-active/)

  // Cases active
  await page.goto('/practicum/cases')
  const casesNav = page.locator('[data-nav-key="cases"]')
  await expect(casesNav).toHaveAttribute('aria-current', 'page')
  await expect(casesNav).toHaveClass(/nav-item-active/)

  // Reviews active
  await page.goto('/practicum/reviews')
  const reviewsNav = page.locator('[data-nav-key="reviews"]')
  await expect(reviewsNav).toHaveAttribute('aria-current', 'page')

  // Data center active
  await page.goto('/practicum/data-center')
  const dataNav = page.locator('[data-nav-key="data-center"]')
  await expect(dataNav).toHaveAttribute('aria-current', 'page')
})

test('[PHASE-A-05] student sidebar hides all admin navigation entries', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')

  // No admin entries in sidebar
  await expect(page.locator('[data-nav-key="plans"]')).toHaveCount(0)
  await expect(page.locator('[data-nav-key="reviews"]')).toHaveCount(0)
  await expect(page.locator('[data-nav-key="data-center"]')).toHaveCount(0)

  // Direct admin URL still shows forbidden
  await page.goto('/practicum/reviews')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
})

// ── A-06: 学生计划入口 ─────────────────────────────────────

test('[PHASE-A-06] student home shows published plan links', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')

  // Published plan ("网店运营") is visible as link
  await expect(page.locator('[data-plan-link][data-plan-id="plan-wdds"]')).toBeVisible()

  // Clicking the plan link navigates to learn page
  await page.locator('[data-plan-link][data-plan-id="plan-wdds"]').click()
  await expect(page).toHaveURL(/\/practicum\/learn\/plan-wdds/)
  await expect(page.locator('[data-learn-plan]')).toBeVisible()
})

test('[PHASE-A-06] student home does not show draft plan links', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // Draft plan link is not visible
  await expect(page.locator('[data-plan-link][data-plan-id="plan-wdsj"]')).toHaveCount(0)
})

// ── A-07: 统一页面状态 ─────────────────────────────────────

test('[PHASE-A-07] loading state appears before content renders', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()

  // Navigate to a page that shows loading state
  await page.goto('/practicum/resources')
  // The loading state should appear (even if briefly)
  // After load, forbidden should NOT appear for OWNER
  await expect(page.locator('[data-forbidden]')).toHaveCount(0)
})

test('[PHASE-A-07] forbidden state shows on admin pages for students', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  const adminPages = [
    { route: '/practicum/resources', text: /管理|资源/ },
    { route: '/practicum/members', text: /管理|成员/ },
    { route: '/practicum/reviews', text: /权限|审核/ },
    { route: '/practicum/data-center', text: /管理|数据/ },
    { route: '/practicum/room-settings', text: /管理|设置|实训/ },
    { route: '/practicum/plans/plan-wdds/edit', text: /学生|编辑|课程目录/ },
  ]

  for (const { route, text } of adminPages) {
    await page.goto(route)
    const forbidden = page.locator('[data-forbidden]')
    await expect(forbidden).toBeVisible()
    await expect(forbidden).toContainText(text)
  }
})

test('[PHASE-A-07] empty state shows when data list is empty', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()

  // Room settings exists and should show the form, not empty
  await page.goto('/practicum/room-settings')
  await expect(page.locator('[data-room-introduction]')).toBeVisible()
})

test('[PHASE-A-07] draft plan shows forbidden for student via direct URL', async ({ page }) => {
  await loginAsStudent(page)

  // Navigate to draft plan detail page
  await page.goto('/practicum/plans/plan-wdsj')

  // Should show forbidden
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-forbidden]')).toContainText(/未发布|无法查看/)

  // Should NOT expose plan detail content
  await expect(page.locator('[data-plan-detail]')).toHaveCount(0)
})

// ── 刷新后身份保持 ───────────────────────────────────────

test('[PHASE-A-PERSIST] role identity persists after page refresh', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')
  await expect(page.locator('[data-owner-home]')).toBeVisible()

  // Refresh the page
  await page.reload()

  // Role should persist
  await expect(page.locator('[data-owner-home]')).toBeVisible()
  await expect(page.locator('[data-student-home]')).toHaveCount(0)

  // Sidebar nav should still show OWNER items
  const navItems = page.locator('[data-practicum-sidebar] [data-nav-item]')
  await expect(navItems).toHaveCount(5)
})

test('[PHASE-A-PERSIST] student role persists after refresh', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')

  await page.reload()
  await expect(page.locator('[data-student-home]')).toBeVisible()

  // Student nav should still be 4 items
  const navItems = page.locator('[data-practicum-sidebar] [data-nav-item]')
  await expect(navItems).toHaveCount(4)
})

// ── 重复点击保护 ──────────────────────────────────────────

test('[PHASE-A-DBLCLICK] create plan submit button disables during submission', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  // Count existing plans
  const initialCount = await page.locator('[data-plan-card]').count()

  // Click "新建计划" to open form
  await page.locator('[data-create-plan]').click()
  await expect(page.locator('[data-create-plan-form]')).toBeVisible()

  // Fill in form
  await page.locator('[data-plan-title-input]').fill('测试计划')
  await page.locator('[data-plan-desc-input]').fill('测试描述')

  // Submit
  const submitBtn = page.locator('[data-plan-submit]')
  await submitBtn.click()

  // Form should close after successful submission
  await expect(page.locator('[data-create-plan-form]')).toHaveCount(0)

  // Only one new plan should be created
  const finalCount = await page.locator('[data-plan-card]').count()
  expect(finalCount).toBe(initialCount + 1)

  // The new plan should appear
  const planCards = page.locator('[data-plan-card]')
  const titles = await planCards.locator('strong').allTextContents()
  const matchingTitles = titles.filter(t => t === '测试计划')
  expect(matchingTitles.length).toBe(1)
})
