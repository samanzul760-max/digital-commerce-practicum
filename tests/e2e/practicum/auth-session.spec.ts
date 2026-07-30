import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  const bootstrap = await page.request.get('/api/auth/bootstrap')
  if ((await bootstrap.json()).available) {
    const response = await page.request.post('/api/auth/bootstrap-owner', {
      data: {
        identifier: `auth-suite-owner-${Date.now()}`,
        displayName: '认证测试管理员',
        password: 'AuthSuiteOwner123!',
      },
    })
    expect(response.status()).toBe(200)
  }
  await page.context().clearCookies()
  await page.goto('/practicum/login')
  await page.evaluate(() => window.localStorage.clear())
})

test('[BDD-AUTH-001] unauthenticated users cannot see the protected workspace', async ({ page }) => {
  await page.goto('/practicum')

  await expect(page).toHaveURL(/\/practicum\/login$/)
  await expect(page.locator('[data-login-form]')).toBeVisible()
  await expect(page.locator('[data-plan-card]')).toHaveCount(0)
  await expect(page.locator('[data-member-row]')).toHaveCount(0)
})

test('[BDD-AUTH-002] valid credentials establish a session and show the workspace', async ({ page }) => {
  await expect(page.locator('[data-login-form]')).toBeVisible()
  await page.locator('[data-login-identifier]').fill('owner@example.test')
  await page.locator('[data-login-password]').fill('OwnerPass123!')
  await page.locator('[data-login-submit]').click()

  await expect(page).toHaveURL(/\/practicum$/)
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()
  await expect(page.locator('[data-login-form]')).toHaveCount(0)
})

test('[BDD-AUTH-003] invalid credentials stay on login and expose a generic error', async ({ page }) => {
  await page.locator('[data-login-identifier]').fill('unknown@example.test')
  await page.locator('[data-login-password]').fill('wrong-password')
  await page.locator('[data-login-submit]').click()

  await expect(page.locator('[data-auth-error]')).toBeVisible()
  await expect(page).toHaveURL(/\/practicum\/login$/)
  await expect(page.locator('[data-authenticated-user]')).toHaveCount(0)
})

test('[BDD-AUTH-004] refresh preserves the authenticated session', async ({ page }) => {
  await page.locator('[data-login-identifier]').fill('student@example.test')
  await page.locator('[data-login-password]').fill('StudentPass123!')
  await page.locator('[data-login-submit]').click()
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()
  await expect(page.context().cookies()).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'practicum_session', httpOnly: true }),
  ]))

  await page.reload()

  await expect(page).toHaveURL(/\/practicum$/)
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()
})

test('[BDD-AUTH-005] logout revokes access to the protected workspace', async ({ page }) => {
  await page.locator('[data-login-identifier]').fill('owner@example.test')
  await page.locator('[data-login-password]').fill('OwnerPass123!')
  await page.locator('[data-login-submit]').click()
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()

  await page.goto('/practicum/profile')
  await page.locator('[data-logout]').first().click()

  await expect(page).toHaveURL(/\/practicum\/login$/)
  await page.goto('/practicum')
  await expect(page).toHaveURL(/\/practicum\/login$/)
  await expect(page.locator('[data-plan-card]')).toHaveCount(0)
})
