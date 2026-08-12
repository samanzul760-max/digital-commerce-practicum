import { expect, test, type Page } from '@playwright/test'

async function selectWorkspaceRole(page: Page, role: 'OWNER' | 'STUDENT') {
  await page.goto('/practicum/profile')
  await page.locator(`[data-role-option="${role}"]`).click()
  await expect(page).toHaveURL('/practicum')
}

test('member management uses LearnEC list, controls, and paper surfaces', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  await page.route('**/api/practicum/members**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{ id: 'member-ui-001', label: '数据二组 01号学员', role: 'STUDENT', group: '数据二组' }],
      groups: [{ id: 'group-data', name: '数据二组', memberCount: 1 }],
    }),
  }))
  await page.goto('/practicum/members')

  const row = page.locator('[data-member-row]')
  await expect(row).toHaveClass(/member-management-row/)
  await expect(row).toHaveClass(/paper/)
  await expect(row.locator('[data-save-member-group]')).toHaveClass(/secondary-button/)
  await expect(row.locator('[data-change-member-role]')).toHaveClass(/secondary-button/)
  await expect(row.locator('[data-remove-member]')).toHaveClass(/secondary-button/)

  const inputStyle = await row.locator('[data-member-group]').evaluate(element => {
    const style = getComputedStyle(element)
    return { height: style.height, borderColor: style.borderColor, borderRadius: style.borderRadius }
  })
  expect(inputStyle).toEqual({ height: '32px', borderColor: 'rgb(233, 237, 240)', borderRadius: '4px' })
  await expect(page.locator('[data-member-group-summary]')).toHaveClass(/paper/)
})

test('owner task permission state offers a polished student-view shortcut', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  await page.goto('/practicum/tasks')

  const state = page.locator('[data-forbidden]')
  await expect(state).toHaveClass(/permission-empty-state/)
  await expect(state).toHaveClass(/paper/)
  await expect(state.locator('.permission-empty-icon .practicum-icon')).toBeVisible()
  await expect(state).toContainText('学生任务页仅学生视角可用')

  const switchButton = state.locator('[data-switch-to-student]')
  await expect(switchButton).toHaveClass(/blue-btn/)
  await switchButton.click()
  await expect(page.locator('[data-student-tasks]')).toBeVisible()
})

test('student task metrics and todo actions use LearnEC paper and button styles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await selectWorkspaceRole(page, 'STUDENT')
  await page.goto('/practicum/tasks')

  await expect(page.locator('[data-task-metrics] .metric.paper')).toHaveCount(4)
  await expect(page.locator('[data-server-todo-list]')).toHaveClass(/paper/)
  await expect(page.locator('.todo-item .blue-btn').first()).toBeVisible()
  const mobileLayout = await page.evaluate(() => {
    const topbar = document.querySelector<HTMLElement>('[data-practicum-topbar]')?.getBoundingClientRect()
    const tabs = document.querySelector<HTMLElement>('[data-practicum-topbar] .topbar-tabs')?.getBoundingClientRect()
    const backbar = document.querySelector<HTMLElement>('[data-workspace-backbar]')?.getBoundingClientRect()
    const heading = document.querySelector<HTMLElement>('[data-student-tasks] h1')?.getBoundingClientRect()
    return {
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      tabsContainedByTopbar: Boolean(topbar && tabs && tabs.bottom <= topbar.bottom + 1),
      topbarClearsBackbar: Boolean(topbar && backbar && topbar.bottom <= backbar.top + 1),
      backbarClearsHeading: Boolean(backbar && heading && backbar.bottom <= heading.top + 1),
    }
  })
  expect(mobileLayout).toEqual({ noHorizontalOverflow: true, tabsContainedByTopbar: true, topbarClearsBackbar: true, backbarClearsHeading: true })
})

test('student center keeps the LearnEC overview and real feature entry points', async ({ page }) => {
  await selectWorkspaceRole(page, 'STUDENT')
  await page.goto('/practicum/progress')

  await expect(page.locator('[data-student-growth]')).toBeVisible()
  await expect(page.locator('[data-center-nav] a')).toHaveCount(5)
  await expect(page.locator('[data-center-nav] a[href="/practicum/shop/products"]')).toContainText('模拟店铺')
  await expect(page.locator('[data-center-nav] a[href="/practicum/tasks"]')).toContainText('作业')
  await expect(page.locator('[data-center-welcome] .medal')).toHaveCount(3)
  await expect(page.locator('[data-center-stat-row] .stat')).toHaveCount(3)
  await expect(page.locator('[data-center-progress]')).toBeVisible()
  await expect(page.locator('[data-center-calendar]')).toBeVisible()
})

test('[BDD-STUDENT-CENTER-001] student center renders server courses and notifications over stale browser business data', async ({ page }) => {
  await selectWorkspaceRole(page, 'STUDENT')

  await page.route('**/api/practicum/progress**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      plans: [{ id: 'assignment-server-center', title: '服务端任务计划', status: 'PUBLISHED', total: 2, completed: 1, graded: 0, percent: 50, nextTaskId: 'task-server-center', averageScore: null }],
      totals: { total: 2, completed: 1, percent: 50 },
    }),
  }))
  await page.route('**/api/practicum/stats**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ stats: { publishedPlanCount: 1, activityCount: 2 } }),
  }))
  await page.route('**/api/practicum/plans**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{ id: 'plan-server-center', roomId: 'room-001', title: '服务端课程', description: '来自真实课程接口的课程。', status: 'PUBLISHED', sort: 1, moduleIds: [], createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' }],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    }),
  }))
  await page.route('**/api/practicum/notifications**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [{ id: 'notification-server-center', title: '服务端通知', targetRoute: '/practicum/tasks', targetRole: 'STUDENT', read: false }], unread: 1 }),
  }))

  await page.evaluate(() => {
    const key = 'digital-commerce-practicum.v1'
    const current = JSON.parse(localStorage.getItem(key) || '{}')
    localStorage.setItem(key, JSON.stringify({
      ...current,
      plans: [{ id: 'local-stale-plan', roomId: 'room-001', title: '本地旧课程', description: '', status: 'PUBLISHED', sort: 1, moduleIds: [], createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z' }],
      notifications: [{ id: 'notification-local-stale', title: '本地旧通知', targetRoute: '/practicum/tasks', targetRole: 'STUDENT', read: false }],
    }))
  })
  await page.reload()

  await page.goto('/practicum/progress')

  await expect(page.locator('[data-overall-progress]')).toContainText('50%')
  await expect(page.locator('[data-center-server-course]')).toContainText('服务端课程')
  await expect(page.locator('[data-center-server-course]')).not.toContainText('本地旧课程')
  await expect(page.locator('[data-center-server-notification]')).toContainText('服务端通知')
  await expect(page.locator('[data-center-server-notification]')).not.toContainText('本地旧通知')
})

test('class achievement metrics and radar use paper surfaces with safe labels', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  await page.goto('/practicum/achievements')

  await expect(page.locator('[data-achievement-metrics] .paper')).toHaveCount(4)
  await expect(page.locator('[data-achievement-radar]')).toHaveClass(/paper/)
  const labelsFit = await page.locator('[data-achievement-radar] svg').evaluate(svg => {
    const svgBox = svg.getBoundingClientRect()
    return Array.from(svg.querySelectorAll('text')).every((label) => {
      const box = label.getBoundingClientRect()
      return box.left >= svgBox.left && box.right <= svgBox.right && box.top >= svgBox.top && box.bottom <= svgBox.bottom
    })
  })
  expect(labelsFit).toBe(true)
})
