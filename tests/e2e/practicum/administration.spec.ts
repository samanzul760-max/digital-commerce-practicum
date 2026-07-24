import { expect, test } from '@playwright/test'

/**
 * Given an administrator opens the resource library
 * When the administrator records metadata for a resource
 * Then the resource can be found with the library search
 */
test('[ASSUME-S2-001] administrator manages metadata-only resources in the library', async ({ page }) => {
  const name = `Library guide ${Date.now()}`
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/resources')
  await page.locator('[data-library-add-resource]').click()
  await page.locator('[data-library-resource-name]').fill(name)
  await page.locator('[data-library-resource-url]').fill('https://example.test/guide')
  await page.locator('[data-library-resource-save]').click()
  await page.locator('[data-resource-search]').fill(name)
  await expect(page.locator('[data-library-resource]').filter({ hasText: name })).toBeVisible()
})

/**
 * Given an administrator opens member management
 * When the administrator assigns an anonymized member to a virtual group
 * Then the updated group is shown in the member list
 */
test('[ASSUME-S2-001] administrator manages anonymized members and virtual groups', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/members')
  const member = page.locator('[data-member-row]').first()
  await member.locator('[data-member-group]').fill('运营一组')
  await member.locator('[data-save-member-group]').click()
  await expect(member).toContainText('运营一组')
})

/**
 * Given an administrator opens training-room settings
 * When the administrator saves room introduction and promotional media metadata
 * Then the saved state is shown without uploading media
 */
test('[CASE-S2-004] administrator saves training-room introduction metadata', async ({ page }) => {
  const introduction = `实训室介绍 ${Date.now()}`
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/room-settings')
  await page.locator('[data-room-introduction]').fill(introduction)
  await page.locator('[data-room-media-url]').fill('https://example.test/room-media')
  await page.locator('[data-save-room-settings]').click()
  await expect(page.locator('[data-room-saved]')).toBeVisible()
  await expect(page.locator('[data-room-introduction]')).toHaveValue(introduction)
})
