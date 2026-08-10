import { expect, test } from '@playwright/test'

test.describe('LearnEC Phase A v2', () => {
  test.beforeEach(async ({ page }) => { await page.context().clearCookies() })

  test('seeded admin authenticates through the new login entry', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('[data-learnec-login]')).toBeVisible()

    await page.locator('[data-login-identifier]').fill('admin')
    await page.locator('[data-login-password]').fill(process.env.SEED_ADMIN_PASSWORD ?? '')
    await page.locator('[data-login-submit]').click()

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.locator('[data-shell-role="ADMIN"]')).toBeVisible()
  })

  test('student cannot enter the administrator account-management route', async ({ page }) => {
    await page.request.post('/api/auth/login', {
      data: { identifier: 'student1', password: process.env.SEED_STUDENT1_PASSWORD ?? '' },
    })

    await page.goto('/admin/accounts')
    await expect(page).toHaveURL(/\/center(?:\/|$)/)
    await expect(page.locator('[data-account-manager]')).toHaveCount(0)
  })

  test('admin shell exposes exactly the five approved top-level menus', async ({ page }) => {
    const login = await page.request.post('/api/auth/login', {
      data: { identifier: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? '' },
    })
    expect(login.status()).toBe(200)

    await page.goto('/admin')
    await expect(page.locator('[data-learnec-menu]')).toHaveCount(5)
    const menuKeys = await page.locator('[data-learnec-menu]').evaluateAll(items => (
      items.map(item => item.getAttribute('data-menu-key'))
    ))
    expect(menuKeys).toEqual(['workspace', 'tasks', 'reviews', 'competitions', 'data'])
  })

  test('admin generates and resets a student account from the management page', async ({ page }) => {
    const login = await page.request.post('/api/auth/login', {
      data: { identifier: 'admin', password: process.env.SEED_ADMIN_PASSWORD ?? '' },
    })
    expect(login.status()).toBe(200)

    await page.goto('/admin/accounts')
    await expect(page.locator('[data-account-manager]')).toBeVisible()
    await page.getByRole('button', { name: '生成学生账号' }).click()
    await page.locator('input').nth(0).fill('student-e2e')
    await page.locator('input').nth(1).fill('E2E 学生')
    const [accountCreation] = await Promise.all([
      page.waitForResponse(response => response.url().endsWith('/api/admin/accounts') && response.request().method() === 'POST'),
      page.getByRole('button', { name: '确认生成' }).click(),
    ])
    expect(accountCreation.status()).toBe(201)

    await expect(page.getByText('账号已生成。临时密码：')).toBeVisible()
    const row = page.locator('tr').filter({ hasText: 'student-e2e' })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: '重置密码' }).click()
    await expect(page.getByText('临时密码已重置：')).toBeVisible()
  })
})
