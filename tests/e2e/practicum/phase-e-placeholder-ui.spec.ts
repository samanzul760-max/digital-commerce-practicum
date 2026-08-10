import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, role: 'ADMIN' | 'STUDENT') {
  await page.context().clearCookies()
  const response = await page.request.post('/api/auth/login', {
    data: role === 'ADMIN'
      ? { identifier: 'admin', password: process.env.SEED_ADMIN_PASSWORD }
      : { identifier: 'student1', password: process.env.SEED_STUDENT1_PASSWORD },
  })
  expect(response.status()).toBe(200)
}

async function expectNoOverflow(page: Page) {
  expect(await page.locator('html').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1)
}

test.describe('LearnEC Phase E placeholder, compatibility, and visual closure', () => {
  test('ADMIN legacy competition route maps to an honest capability placeholder', async ({ page }) => {
    await login(page, 'ADMIN')
    await page.goto('/practicum/competitions')
    await expect(page).toHaveURL(/\/admin\/competitions$/)
    await expect(page.locator('[data-capability-placeholder]')).toBeVisible()
    await expect(page.getByText('COMING_SOON', { exact: true })).toBeVisible()
    await expect(page.locator('[data-capability-placeholder] form, [data-capability-placeholder] button[type="submit"]')).toHaveCount(0)
  })

  test('new dashboards use the LearnEC shell and preserve role boundaries', async ({ page }) => {
    await login(page, 'STUDENT')
    await page.goto('/center')
    await expect(page.locator('[data-learnec-shell]')).toBeVisible()
    await expect(page.locator('[data-center-dashboard]')).toBeVisible()
    await expect(page.locator('[data-center-calendar]')).toBeVisible()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/center$/)

    await login(page, 'ADMIN')
    await page.goto('/admin')
    await expect(page.locator('[data-admin-dashboard]')).toBeVisible()
    await page.goto('/center')
    await expect(page).toHaveURL(/\/admin$/)

    await login(page, 'STUDENT')
    await page.goto('/center/practicum/customer-service')
    await page.getByRole('link', { name: '返回工作中心' }).click()
    await expect(page).toHaveURL(/\/center$/)
  })

  test('unauthenticated legacy links still require login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/practicum/competitions')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('shell and placeholder pages do not overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, 'ADMIN')
    for (const route of ['/admin', '/admin/competitions', '/admin/training-centers']) {
      await page.goto(route)
      await expectNoOverflow(page)
    }
    await login(page, 'STUDENT')
    for (const route of ['/center', '/center/practicum/customer-service']) {
      await page.goto(route)
      await expectNoOverflow(page)
    }
  })
})
