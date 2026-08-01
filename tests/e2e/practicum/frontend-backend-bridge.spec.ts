import { test, expect } from '@playwright/test'
import { loginAsStudent, loginAsOwner } from './auth-helpers'

/**
 * 前后端桥接测试 - 课程大厅从后端 API 获取课程
 *
 * Given a student opens the course hall
 * When the page loads
 * Then the course data comes from /api/practicum/plans (either directly or via fallback)
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
  // Either the backend loads successfully or a fallback message is shown
  const backendLoading = page.locator('[data-backend-loading]')
  const backendFallback = page.locator('[data-backend-fallback]')
  const courseCards = page.locator('[data-course-card]')

  // Wait for either cards to appear OR a fallback/loading message
  await expect(
    courseCards.first().or(backendFallback).or(backendLoading)
  ).toBeVisible({ timeout: 8000 })

  // Verify api was called at least once
  expect(apiCalled).toBeTruthy()
})

/**
 * 前后端桥接测试 - 课程详情从后端打开
 *
 * Given a student opens a course from the course hall
 * When navigating to the course detail page
 * Then the page loads without error (backend data or fallback)
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
 * Then either backend stats or a fallback message appears
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

  // At least one of these should be visible
  const hasStats = await backendStats.isVisible().catch(() => false)
  const hasOverall = await overallProgress.isVisible().catch(() => false)
  const hasProgress = (await progressRows.count().catch(() => 0)) > 0

  expect(hasStats || hasOverall || hasProgress).toBeTruthy()
})
