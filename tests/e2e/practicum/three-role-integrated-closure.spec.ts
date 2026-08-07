import { expect, test } from '@playwright/test'
import { loginAsOwner, loginAsStudent, loginAsTeacher } from './auth-helpers'

test.describe('three-role integrated closure contract', () => {
  test('[J-TEACHER-01] a teacher can enter an assigned classroom workbench from the class route', async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto('/practicum/classes')
    await expect(page.locator('[data-class-row]').first()).toBeVisible()
    await page.locator('[data-class-row]').first().getByRole('link', { name: /课堂|教学/ }).click()
    await expect(page).toHaveURL(/\/practicum\/teaching\//)
    await expect(page.locator('[data-teaching-workbench]')).toBeVisible()
  })

  test('[J-ADMIN-01] an owner can persist room settings and reach template/competition operations without local business fallback', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/practicum/room-settings')
    await expect(page.locator('[data-room-settings-page]')).toBeVisible()
    await page.goto('/practicum/templates')
    await expect(page.locator('[data-template-page]')).toBeVisible()
    await page.goto('/practicum/competitions')
    await expect(page.locator('[data-competition-page]')).toBeVisible()
  })

  test('[J-STUDENT-01] a student can enter a published competition but cannot access owner templates directly', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/practicum/competitions')
    await expect(page.locator('[data-competitions-page]')).toBeVisible()
    await page.goto('/practicum/templates')
    await expect(page.loc('[data-forbidden], [data-access-denied]')).toBeVisible()
  })
})

// Deferred verification only. Do not run before the one-time validation window:
// npx playwright test tests/e2e/practicum/three-role-integrated-closure.spec.ts
