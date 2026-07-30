import { expect, test } from '@playwright/test'

test('owner can open a member analytics detail page from a direct URL', async ({ page }) => {
  await page.goto('/practicum/member-data/member-001')
  await expect(page.locator('[data-member-data-page]')).toBeVisible()
  await expect(page.locator('[data-member-label]')).toContainText(`${String.fromCodePoint(0x5b66, 0x751f)} 001`)
  await expect(page.locator('[data-member-completion]')).toContainText('%')
  await expect(page.locator('[data-member-plan-breakdown]')).toBeVisible()
  await expect(page.locator('[data-member-skill-map]')).toBeVisible()
})

test('owner can inspect the member skill map on a mobile viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/practicum/member-data/member-001')

  await expect(page.locator('[data-member-data-page]')).toBeVisible()
  await expect(page.locator('[data-member-skill-map]')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
