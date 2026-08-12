import { expect, test } from '@playwright/test'
import { loginAsOwner, loginAsStudent } from './auth-helpers'
import { csrfHeaders } from './csrf'

test.beforeEach(async ({ page }, testInfo) => {
  if (/\[BDD-AUTH-00[678]\]/.test(testInfo.title)) {
    await page.context().clearCookies()
    return
  }
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

test('[BDD-AUTH-002] valid credentials submitted from the login form establish a session and show the workspace', async ({ page }) => {
  await page.goto('/practicum/login')
  await expect(page.locator('[data-login-form]')).toBeVisible()
  await page.locator('[data-login-identifier]').fill('owner@example.test')
  await page.locator('[data-login-password]').fill('OwnerPass123!')
  await page.locator('[data-login-submit]').click()

  await expect(page).toHaveURL(/\/practicum$/)
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()
})

test('[BDD-AUTH-003] invalid credentials API rejects access while the login page keeps the login form', async ({ page }) => {
  const response = await page.request.post('/api/auth/login', {
    data: { identifier: 'unknown@example.test', password: 'wrong-password' },
  })
  expect(response.status()).toBe(401)

  await page.goto('/practicum/login')
  await expect(page.locator('[data-login-form]')).toBeVisible()
  await expect(page.locator('[data-authenticated-user]')).toHaveCount(0)
})

test('[BDD-AUTH-004] refresh preserves the authenticated session', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()
  await expect(page.context().cookies()).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'practicum_session', httpOnly: true }),
  ]))

  await page.reload()

  await expect(page).toHaveURL(/\/practicum$/)
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()
})

test('[BDD-AUTH-005] logout revokes access to the protected workspace', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum')
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()

  await page.goto('/practicum/profile')
  await page.locator('[data-logout]').first().click()

  await expect(page).toHaveURL(/\/practicum\/login$/)
  await page.goto('/practicum')
  await expect(page).toHaveURL(/\/practicum\/login$/)
  await expect(page.locator('[data-plan-card]')).toHaveCount(0)
})

test('[BDD-AUTH-006] owner can switch to an authorized student role and refresh keeps it', async ({ page }) => {
  await loginAsOwner(page)

  const response = await page.request.post('/api/auth/switch-role', {
    headers: await csrfHeaders(page),
    data: { role: 'STUDENT' },
  })

  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({
    user: {
      role: 'STUDENT',
      authorizedRoles: ['OWNER', 'STUDENT'],
    },
  })
  expect(await (await page.request.get('/api/auth/session')).json()).toMatchObject({
    user: { role: 'STUDENT' },
  })
})

test('[BDD-AUTH-007] student cannot switch to an unauthorized owner role', async ({ page }) => {
  await loginAsStudent(page)

  const response = await page.request.post('/api/auth/switch-role', {
    headers: await csrfHeaders(page),
    data: { role: 'OWNER' },
  })

  expect(response.status()).toBe(403)
  expect(await response.json()).toMatchObject({ data: { code: 'ROLE_NOT_AUTHORIZED' } })
  expect(await (await page.request.get('/api/auth/session')).json()).toMatchObject({
    user: { role: 'STUDENT' },
  })
})

test('[BDD-AUTH-008] role switching requires csrf', async ({ page }) => {
  await loginAsOwner(page)

  const response = await page.request.post('/api/auth/switch-role', {
    data: { role: 'STUDENT' },
  })

  expect(response.status()).toBe(403)
  expect(await response.json()).toMatchObject({ data: { code: 'CSRF_INVALID' } })
  expect(await (await page.request.get('/api/auth/session')).json()).toMatchObject({
    user: { role: 'OWNER' },
  })
})

test('[BDD-AUTH-009] authenticated user can update the profile and refresh keeps the display name', async ({ page }) => {
  await loginAsOwner(page)
  const displayName = `资料验收${Date.now()}`

  const response = await page.request.patch('/api/auth/profile', {
    headers: await csrfHeaders(page),
    data: { displayName },
  })

  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({ user: { displayName } })
  expect(await (await page.request.get('/api/auth/session')).json()).toMatchObject({ user: { displayName } })
})

test('[BDD-AUTH-010] profile update requires csrf', async ({ page }) => {
  await loginAsOwner(page)

  const response = await page.request.patch('/api/auth/profile', {
    data: { displayName: '缺少凭据' },
  })

  expect(response.status()).toBe(403)
  expect(await response.json()).toMatchObject({ data: { code: 'CSRF_INVALID' } })
})
