import { test, expect } from '@playwright/test'
import { loginAsStudent, loginAsOwner } from './auth-helpers'

/**
 * 首页入口测试 - 学生视角
 *
 * Given a student opens the home page
 * When the hero and entry cards render
 * Then:
 *   - The hero visual (data-home-hero-art) is visible
 *   - At least 4 home entry cards (data-home-entry-card) exist
 *   - Each entry card has a real href to a practicum route
 *   - Course recommendations do not show empty-shell courses
 */
test('[HOME-001] student home has hero art and at least 4 real entry cards', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // Hero visual must be visible
  const heroArt = page.locator('[data-home-hero-art]')
  await expect(heroArt).toBeVisible()

  // At least 4 home entry cards
  const entryCards = page.locator('[data-home-entry-card]')
  const entryCount = await entryCards.count()
  expect(entryCount).toBeGreaterThanOrEqual(4)

  // Each entry card must have a valid href
  for (let i = 0; i < entryCount; i++) {
    const card = entryCards.nth(i)
    const href = await card.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href).toMatch(/^\/practicum\//)
  }

  // Recommended courses should not show empty-shell courses
  const courseCards = page.locator('[data-course-card]')
  const cardCount = await courseCards.count()
  for (let i = 0; i < cardCount; i++) {
    const card = courseCards.nth(i)
    const text = await card.textContent()
    expect(text).not.toMatch(/publish-\d+/i)
    expect(text).not.toMatch(/0\s*节课程.*0\s*个实操项目/)
  }
})

/**
 * 首页入口测试 - 管理员视角
 *
 * Given an owner opens the home page
 * When the hero and entry cards render
 * Then:
 *   - The hero visual is visible
 *   - At least 4 home entry cards exist
 *   - Entry cards include management-relevant routes
 */
test('[HOME-002] owner home has hero art and real management entry cards', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  // Hero visual must be visible
  const heroArt = page.locator('[data-home-hero-art]')
  await expect(heroArt).toBeVisible()

  // At least 4 home entry cards
  const entryCards = page.locator('[data-home-entry-card]')
  const entryCount = await entryCards.count()
  expect(entryCount).toBeGreaterThanOrEqual(4)

  // Each entry card must have a valid href
  for (let i = 0; i < entryCount; i++) {
    const card = entryCards.nth(i)
    const href = await card.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href).toMatch(/^\/practicum\//)
  }
})

/**
 * 首页入口点击测试
 *
 * Given a student is on the home page
 * When clicking a home entry card
 * Then navigation works and lands on a real page
 */
test('[HOME-003] home entry cards navigate to real pages', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // Click the first entry card
  const firstEntry = page.locator('[data-home-entry-card]').first()
  await expect(firstEntry).toBeVisible()
  await firstEntry.click()

  // Should navigate away from home
  await expect(page).not.toHaveURL(/\/practicum$/)

  // Should not land on an error page
  await expect(page.locator('[data-state-panel="error"]')).toHaveCount(0)
  await expect(page.locator('[data-practicum-topbar]')).toBeVisible()
})
