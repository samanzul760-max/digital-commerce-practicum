import { expect, test } from '@playwright/test'
import { loginAsOwner, loginAsStudent } from './auth-helpers'

test('[HOME-001] student home presents the operations queue and live dashboard', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')

  await expect(page.locator('[data-student-home]')).toBeVisible()
  await expect(page.getByRole('heading', { name: '学员经营工作台' })).toBeVisible()
  await expect(page.getByLabel('模拟经营实时看板').locator('article')).toHaveCount(4)
  await expect(page.getByRole('heading', { name: '今日运营工作队列' })).toBeVisible()
  await expect(page.locator('[data-plan-link][data-plan-id="plan-wdds"]')).toBeVisible()
  await expect(page.getByRole('link', { name: '进入模拟店铺' })).toHaveAttribute('href', '/practicum/shop/products')
  await expect(page.locator('[data-home-hero-art], [data-home-entry-card]')).toHaveCount(0)
})

test('[HOME-002] owner home presents management metrics and database-backed plan table', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum')

  await expect(page.locator('[data-owner-home] [data-admin-metric]')).toHaveCount(4)
  await expect(page.locator('[data-plan-list]')).toBeVisible()
  await expect(page.locator('[data-review-summary]')).toBeVisible()
  await expect(page.locator('[data-activity-feed]')).toBeVisible()
  await expect(page.locator('[data-achievements-home-entry]')).toHaveAttribute('href', '/practicum/achievements')
  await expect(page.locator('[data-home-hero-art], [data-home-entry-card]')).toHaveCount(0)
})

test('[HOME-003] student operations shortcut navigates to the real shop sandbox', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')

  await page.getByRole('link', { name: '进入模拟店铺' }).click()
  await expect(page).toHaveURL('/practicum/shop/products')
  await expect(page.locator('[data-shop-products]')).toBeVisible()
  await expect(page.locator('[data-state-panel="error"]')).toHaveCount(0)
  await expect(page.locator('[data-practicum-topbar]')).toBeVisible()
})
