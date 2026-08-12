import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/practicum/login')
})

test('[BDD-AUTH-006] first administrator setup creates a persistent authenticated session', async ({ page }) => {
  const identifier = `operator-${randomUUID().slice(0, 8)}`
  const password = `${randomUUID()}${randomUUID()}`

  const response = await page.request.post('/api/auth/bootstrap-owner', {
    data: { identifier, displayName: '验收管理员', password },
  })
  expect(response.status()).toBe(200)
  await page.goto('/practicum')

  await expect(page).toHaveURL(/\/practicum$/)
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()
})

test('[BDD-AUTH-007] completed setup does not expose the setup form again', async ({ page }) => {
  await expect(page.locator('[data-bootstrap-form]')).toHaveCount(0)
  await expect(page.locator('[data-login-form]')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('[data-login-form]')).toBeVisible()
  const fitsViewport = await page.locator('body').evaluate(body => body.scrollWidth <= window.innerWidth)
  expect(fitsViewport).toBeTruthy()

  const response = await page.request.post('/api/auth/bootstrap-owner', {
    data: { identifier: 'another-owner', displayName: 'Another owner', password: `${randomUUID()}${randomUUID()}` },
  })
  expect(response.status()).toBe(409)
  expect((await response.json()).data.code).toBe('BOOTSTRAP_ALREADY_COMPLETED')
})

test('[BDD-AUTH-008] unauthenticated workspace visits redirect to the dedicated login route', async ({ page }) => {
  await page.goto('/practicum')

  await expect(page).toHaveURL(/\/practicum\/login$/)
  await expect(page.locator('[data-plan-card]')).toHaveCount(0)
})
