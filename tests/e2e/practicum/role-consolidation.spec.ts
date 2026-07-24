import { expect, test } from '@playwright/test'

/**
 * Given a user opens the practicum Personal page
 * When the available identities are shown
 * Then only Administrator and Student identities are available
 */
test('[ORIGINAL-S1-001] personal page only offers administrator and student identities', async ({ page }) => {
  await page.goto('/practicum/profile')

  await expect(page.locator('[data-role-option]')).toHaveCount(2)
  const roleValues = await page.locator('[data-role-option]').evaluateAll(options =>
    options.map(option => option.getAttribute('data-role-option')).sort(),
  )
  expect(roleValues).toEqual(['OWNER', 'STUDENT'])
})
