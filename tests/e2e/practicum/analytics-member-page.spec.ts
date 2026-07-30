import { expect, test } from '@playwright/test'

test('owner can open a member analytics detail page from a direct URL', async ({ page }) => {
  await page.goto('/practicum/member-data/member-001')
  await expect(page.locator('[data-member-data-page]')).toBeVisible()
  await expect(page.locator('[data-member-label]')).toContainText(`${String.fromCodePoint(0x5b66, 0x751f)} 001`)
  await expect(page.locator('[data-member-completion]')).toContainText('%')
  await expect(page.locator('[data-member-plan-breakdown]')).toBeVisible()
})
