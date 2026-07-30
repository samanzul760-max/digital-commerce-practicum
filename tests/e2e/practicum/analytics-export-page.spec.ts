import { expect, test } from '@playwright/test'

test('data center exports the server CSV response', async ({ page }) => {
  let exportRequestSeen = false
  await page.route('**/api/practicum/analytics/export?roomId=room-001', async route => {
    exportRequestSeen = true
    await route.fulfill({
      contentType: 'text/csv; charset=utf-8',
      body: 'member_id,plan_title,activity_title,status,version,score\n"server-member","Server plan","Server activity","GRADED","1","88"',
    })
  })

  await page.goto('/practicum/data-center')
  await page.locator('[data-export-btn]').click()
  await page.locator('[data-export-confirm]').click()
  await expect.poll(() => exportRequestSeen).toBe(true)
  await expect(page.locator('[data-export-success]')).toBeVisible()
})
