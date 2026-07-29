import { expect, test } from '@playwright/test'

test('[SB-G-03][SB-G-04] authenticated users can see their server-backed organization and room context', async ({ page }) => {
  await page.goto('/practicum')

  await expect(page.locator('[data-current-organization]')).toContainText('演示职业学院')
  await expect(page.locator('[data-current-room]')).toContainText('数字商贸实训室')
  await expect(page.locator('[data-current-teaching-mode]')).toContainText('教学模式')
})

test('[SB-Q-03] teacher login presents a teacher workspace instead of the administrator workspace', async ({ browser }) => {
  const context = await browser.newContext()
  await context.clearCookies()
  const page = await context.newPage()
  await page.goto('/practicum/login')

  await page.locator('[data-bootstrap-identifier]').fill(`teacher-ui-owner-${Date.now()}`)
  await page.locator('[data-bootstrap-display-name]').fill('教师验收管理员')
  await page.locator('[data-bootstrap-password]').fill('TeacherUiOwner123!')
  await page.locator('[data-bootstrap-submit]').click()
  await expect(page).toHaveURL(/\/practicum$/)
  await page.locator('[data-logout]').first().click()
  await expect(page).toHaveURL(/\/practicum\/login$/)

  await page.locator('[data-login-identifier]').fill('teacher@example.test')
  await page.locator('[data-login-password]').fill('TeacherPass123!')
  await page.locator('[data-login-submit]').click()

  await expect(page.locator('[data-teacher-home]')).toBeVisible()
  await expect(page.locator('[data-owner-home]')).toHaveCount(0)
  await expect(page.locator('[data-workspace-authenticated]')).toContainText('实训教师')
  await context.close()
})

test('[SB-G-03][SB-G-04] workspace context remains readable on a mobile viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.request.post('/api/auth/login', { data: { identifier: 'owner@example.test', password: 'OwnerPass123!' } })
  await page.goto('/practicum')

  await expect(page.locator('[data-current-organization]')).toBeVisible()
  await expect(page.locator('[data-current-room]')).toBeVisible()
  await expect(page.locator('[data-current-teaching-mode]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await context.close()
})

test('[SB-G-03] owner can switch the room context from the top bar and retain it after refresh', async ({ page }) => {
  await page.goto('/practicum')
  await page.locator('[data-workspace-context-select]').selectOption('room-002')

  await expect(page.locator('[data-current-room]')).toContainText('数据运营实训室')
  await page.reload()
  await expect(page.locator('[data-current-room]')).toContainText('数据运营实训室')
})
