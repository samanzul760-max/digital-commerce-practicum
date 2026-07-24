import { expect, test } from '@playwright/test'

/**
 * Given a student selects the Student demo role
 * When the plan list is rendered
 * Then draft plans and plan-management actions are unavailable
 */
test('[CASE-S1-002] student cannot see draft plans or manage plans', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  await expect(page.getByRole('link', { name: /网店运营/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /网店视觉设计/ })).toHaveCount(0)
  await expect(page.locator('[data-action="edit-plan"], [data-action="publish-plan"]')).toHaveCount(0)
})

/**
 * Given a student attempts to open a plan editor URL directly
 * When the student navigates to /practicum/plans/:planId/edit
 * Then the page shows a clear forbidden message and does not expose editing controls
 */
test('[ORIGINAL-S2-002] student is blocked from the plan editor with a clear forbidden message', async ({ page }) => {
  // Switch to Student identity
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // Navigate directly to a known plan editor URL
  await page.goto('/practicum/plans/plan-wdds/edit')

  // Must show a clear forbidden message
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-forbidden]')).toContainText(/学生|查看|课程目录|编辑/)

  // Must NOT expose the plan editor workspace
  await expect(page.locator('[data-plan-editor]')).toHaveCount(0)

  // Must NOT expose any management controls
  await expect(page.locator('[data-create-module]')).toHaveCount(0)
  await expect(page.locator('[data-request-publish]')).toHaveCount(0)
  await expect(page.locator('[data-request-archive]')).toHaveCount(0)
})

/**
 * Given a student knows the ID of a draft plan
 * When the student navigates directly to the draft plan detail URL
 * Then the page does not expose the draft plan title description modules activities or resources
 */
test('[ORIGINAL-S2-002] student cannot read draft plan data via direct URL', async ({ page }) => {
  // Switch to Student identity
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // Navigate directly to a known DRAFT plan (网店视觉设计 = plan-wdsj)
  await page.goto('/practicum/plans/plan-wdsj')

  // Must show a clear forbidden / not-published message
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-forbidden]')).toContainText(/未发布|无法查看/)

  // Must NOT expose plan detail, modules, activities, or resources
  await expect(page.locator('[data-plan-detail]')).toHaveCount(0)
  await expect(page.locator('[data-module]')).toHaveCount(0)
})

/**
 * Given a student attempts to open administration pages
 * When the student navigates to resources members and room-settings URLs
 * Then each page shows a clear forbidden message and does not expose management data or controls
 */
test('[ORIGINAL-S2-002] student is blocked from resources members and room-settings pages', async ({ page }) => {
  // Switch to Student identity
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // --- Resources page ---
  await page.goto('/practicum/resources')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-forbidden]')).toContainText(/管理|资源/)
  await expect(page.locator('[data-library-add-resource]')).toHaveCount(0)
  await expect(page.locator('[data-library-resource]')).toHaveCount(0)
  await expect(page.locator('[data-resource-search]')).toHaveCount(0)

  // --- Members page ---
  await page.goto('/practicum/members')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-forbidden]')).toContainText(/管理|成员/)
  await expect(page.locator('[data-member-row]')).toHaveCount(0)
  await expect(page.locator('[data-save-member-group]')).toHaveCount(0)

  // --- Room settings page ---
  await page.goto('/practicum/room-settings')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-forbidden]')).toContainText(/管理|设置|实训/)
  await expect(page.locator('[data-room-introduction]')).toHaveCount(0)
  await expect(page.locator('[data-save-room-settings]')).toHaveCount(0)
})
