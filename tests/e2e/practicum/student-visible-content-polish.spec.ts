import { test, expect } from '@playwright/test'
import { loginAsStudent } from './auth-helpers'

/**
 * 学生课程大厅过滤测试
 *
 * Given a student opens the course hall
 * When the course list renders
 * Then:
 *   - No publish-数字 shell courses appear
 *   - No "0 节课程 · 0 个实操项目" learnable cards appear
 *   - At least one real course OR a friendly empty state is shown
 */
test('[POLISH-001] student course hall filters empty-shell courses', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  await page.goto('/practicum/courses')

  // Wait for the course hall to be visible
  await expect(page.locator('[data-course-hall]')).toBeVisible()

  // Should NOT show publish-数字 styled shell course titles
  const publishShellPattern = /publish-\d+/i
  const courseCards = page.locator('[data-course-card]')
  const cardCount = await courseCards.count()

  for (let i = 0; i < cardCount; i++) {
    const card = courseCards.nth(i)
    const text = await card.textContent()
    expect(text).not.toMatch(publishShellPattern)
  }

  // Should NOT show "0 节课程 · 0 个实操项目" for student-visible courses
  const zeroContentCards = page.locator('[data-course-card]').filter({ hasText: /0\s*节课程.*0\s*个实操项目/ })
  await expect(zeroContentCards).toHaveCount(0)

  // Must have at least one real course card OR show empty state
  const hasCards = cardCount > 0
  const emptyState = page.locator('[data-state-panel="empty"]')
  const hasEmptyState = await emptyState.isVisible().catch(() => false)

  expect(hasCards || hasEmptyState).toBeTruthy()
})

/**
 * 学员中心填充测试
 *
 * Given a student opens the progress page
 * When the "继续学习" section renders
 * Then:
 *   - Entry cards (data-progress-entry-card) exist and link to real routes
 *   - Entry cards navigate to tasks, courses, notifications, etc.
 */
test('[POLISH-002] progress page fills blank areas with real entry cards', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  await page.goto('/practicum/progress')

  // The dashboard should be visible
  await expect(page.locator('[data-student-growth]')).toBeVisible()

  // "继续学习" section entry cards must exist
  const entryCards = page.locator('[data-progress-entry-card]')
  const entryCount = await entryCards.count()
  expect(entryCount).toBeGreaterThanOrEqual(2)

  // Each entry card must have a valid link
  for (let i = 0; i < entryCount; i++) {
    const card = entryCards.nth(i)
    const href = await card.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href).toMatch(/^\/practicum\//)
  }

  // At least one entry card should link to a known route
  const allHrefs: string[] = []
  for (let i = 0; i < entryCount; i++) {
    const href = await entryCards.nth(i).getAttribute('href')
    if (href) allHrefs.push(href)
  }
  const knownRoutes = ['/practicum/tasks', '/practicum/courses', '/practicum/notifications']
  const hasKnownRoute = knownRoutes.some(route => allHrefs.some(href => href.startsWith(route)))
  expect(hasKnownRoute).toBeTruthy()

  // The calendar section should exist
  await expect(page.locator('[aria-label="学习日历"]')).toBeVisible()

  // "下一次提醒" section should be present
  const nextReminderSection = page.locator('h3').filter({ hasText: '下一次提醒' })
  await expect(nextReminderSection).toBeVisible()
})

/**
 * 学员中心入口导航测试
 *
 * Given a student opens the progress page
 * When entry cards are rendered
 * Then clicking an entry card navigates to a real page without error
 */
test('[POLISH-003] progress entry cards navigate to real routes', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  await page.goto('/practicum/progress')

  // Click the first entry card
  const firstEntry = page.locator('[data-progress-entry-card]').first()
  await expect(firstEntry).toBeVisible()
  await firstEntry.click()

  // Should land on a real practicum page (not 404, not error)
  await expect(page).not.toHaveURL(/\/practicum\/progress$/)
  await expect(page.locator('[data-state-panel="error"]')).toHaveCount(0)

  // The shell should still be visible
  await expect(page.locator('[data-practicum-topbar]')).toBeVisible()
})
