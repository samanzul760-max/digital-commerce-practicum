import { test, expect } from '@playwright/test'
import { loginAsStudent, loginAsOwner } from './auth-helpers'

/**
 * 前后端桥接测试 - 课程大厅从后端 API 获取课程
 *
 * Given a student opens the course hall
 * When the page loads
 * Then the course data comes from /api/practicum/plans or an explicit server error state
 */
test('[BRIDGE-001] course hall loads plans from backend API', async ({ page }) => {
  // Intercept the plans API to confirm it's being called
  let apiCalled = false
  await page.route('**/api/practicum/plans**', async (route) => {
    apiCalled = true
    await route.continue()
  })

  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  await page.goto('/practicum/courses')
  await expect(page.locator('[data-course-hall]')).toBeVisible()

  // The API should have been called (backend loading indicator or data present)
  // The backend either loads data or reports an explicit error.
  const backendLoading = page.locator('[data-backend-loading]')
  const backendError = page.locator('[data-course-server-error]')
  const courseCards = page.locator('[data-course-card]')

  // Wait for either cards to appear OR a loading/error state
  await expect(
    courseCards.first().or(backendError).or(backendLoading)
  ).toBeVisible({ timeout: 8000 })

  // Verify api was called at least once
  expect(apiCalled).toBeTruthy()
})

/**
 * 前后端桥接测试 - 课程详情从后端打开
 *
 * Given a student opens a course from the course hall
 * When navigating to the course detail page
 * Then the page loads without error when backend data is available
 */
test('[BRIDGE-002] course detail opens backend course', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // Go to course hall
  await page.goto('/practicum/courses')
  await expect(page.locator('[data-course-hall]')).toBeVisible()

  // Find a "查看课程" link and click it
  const viewLink = page.locator('[data-course-card] a').filter({ hasText: '查看课程' }).first()
  if (await viewLink.isVisible().catch(() => false)) {
    await viewLink.click()

    // Should land on a course detail page
    await expect(page).toHaveURL(/\/practicum\/courses\//)
    await expect(page.locator('[data-practicum-topbar]')).toBeVisible()

    // Should not show error state
    await expect(page.locator('[data-state-panel="error"]')).toHaveCount(0)
  }
})

/**
 * 前后端桥接测试 - 通知铃铛显示后端未读数
 *
 * Given a user has the topbar visible
 * When notifications load from the backend
 * Then the notification badge or bell is functional
 */
test('[BRIDGE-003] notification bell connects to backend', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  // The notification button must exist
  const notifBtn = page.locator('[data-notification-btn]')
  await expect(notifBtn).toBeVisible()

  // Click the notification button
  await notifBtn.click()

  // The dropdown should appear
  const dropdown = page.locator('[data-notification-dropdown]')
  await expect(dropdown).toBeVisible()

  // The dropdown should have a meaningful title
  await expect(dropdown.locator('[data-dropdown-title]')).toBeVisible()

  // "查看全部通知" link should exist
  const viewAll = page.locator('[data-view-all-notifications]')
  await expect(viewAll).toBeVisible()
})

/**
 * 前后端桥接测试 - 学员中心显示后端 stats
 *
 * Given a student opens the progress page
 * When stats load from the backend
 * Then either backend stats, progress, or an explicit error appears
 */
test('[BRIDGE-004] progress page shows backend stats', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  await page.goto('/practicum/progress')
  await expect(page.locator('[data-student-growth]')).toBeVisible()

  // Either backend stats OR a progress display should be present
  const backendStats = page.locator('[data-backend-stats]')
  const overallProgress = page.locator('[data-overall-progress]')
  const progressRows = page.locator('.progress-row')
  const progressError = page.locator('[data-progress-error]')

  // At least one of these should be visible
  const hasStats = await backendStats.isVisible().catch(() => false)
  const hasOverall = await overallProgress.isVisible().catch(() => false)
  const hasProgress = (await progressRows.count().catch(() => 0)) > 0
  const hasError = await progressError.isVisible().catch(() => false)

  expect(hasStats || hasOverall || hasProgress || hasError).toBeTruthy()
})

test('[BRIDGE-005] student task load and refresh read the server API', async ({ page }) => {
  let loadCount = 0
  await page.route('**/api/practicum/student/tasks', async (route) => {
    loadCount += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{
        id: 'server-task-bridge',
        planAssignmentId: 'server-assignment-bridge',
        activityId: 'server-activity-bridge',
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        availableAt: '2026-08-07T00:00:00.000Z',
        dueAt: null,
        source: { id: 'server-plan-bridge', title: 'SERVER_ONLY_TASK', status: 'PUBLISHED' },
      }] }),
    })
  })

  await loginAsStudent(page)
  await page.goto('/practicum/tasks')
  await expect(page.locator('[data-student-task-row]')).toHaveCount(1)
  await expect(page.getByText('SERVER_ONLY_TASK')).toBeVisible()

  await page.reload()
  await expect(page.locator('[data-student-task-row]')).toHaveCount(1)
  expect(loadCount).toBe(2)
})

test('[BRIDGE-006] student submit posts to the typed server task API', async ({ page }) => {
  let submitPayload: unknown = null
  await page.route('**/api/practicum/student/tasks', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{
        id: 'server-task-bridge',
        planAssignmentId: 'server-assignment-bridge',
        activityId: 'act-data-01-001',
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        availableAt: '2026-08-07T00:00:00.000Z',
        dueAt: null,
        source: { id: 'server-plan-bridge', title: 'SERVER_ONLY_TASK', status: 'PUBLISHED' },
      }] }),
    })
  })
  await page.route('**/api/practicum/student-tasks/server-task-bridge', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ task: { id: 'server-task-bridge', status: 'AVAILABLE' }, submission: null }) })
  })
  await page.route('**/api/practicum/submissions/act-01-001', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ statusCode: 404, statusMessage: 'Not found' }) })
  })
  await page.route('**/api/practicum/student-tasks/server-task-bridge/submissions', async (route) => {
    submitPayload = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ task: { id: 'server-task-bridge', status: 'SUBMITTED' }, submission: { id: 'submission-bridge', currentVersion: 1, submittedAt: '2026-08-07T00:00:00.000Z', versions: [{ id: 'version-bridge', version: 1, text: 'server submission', submittedAt: '2026-08-07T00:00:00.000Z' }] } }) })
  })

  await loginAsStudent(page)
  await page.goto('/practicum/activities/act-01-001?taskId=server-task-bridge')
  await page.locator('[data-practice-draft]').fill('server submission')
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()
  await expect(page.locator('[data-submission-version]')).toHaveCount(1)
  expect(submitPayload).toEqual({ text: 'server submission' })
})

for (const status of [403, 500]) {
  test(`[BRIDGE-007-${status}] student API errors stay visible and do not render seed tasks`, async ({ page }) => {
    await page.route('**/api/practicum/student/tasks', async (route) => {
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ statusCode: status, statusMessage: status === 403 ? 'Forbidden' : 'Server error' }) })
    })

    await loginAsStudent(page)
    await page.goto('/practicum/tasks')
    await expect(page.locator('[data-state-panel="error"]')).toBeVisible()
    await expect(page.locator('[data-student-task-row]')).toHaveCount(0)
    await expect(page.getByText('SERVER_ONLY_TASK')).toHaveCount(0)
  })
}
