import { expect, test } from '@playwright/test'
import { loginAsOwner, loginAsStudent, loginAsTeacher } from './auth-helpers'

test.describe('three-role integrated closure contract', () => {
  test('[J-TEACHER-01] a teacher can enter an assigned classroom workbench from the class route', async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto('/practicum/classes')
    await expect(page.locator('[data-class-row]').first()).toBeVisible()
    await page.locator('[data-class-row]').first().locator('[data-open-class]').click()
    await expect(page).toHaveURL(/\/practicum\/classes\/[^/]+$/)
    await expect(page.locator('[data-class-detail]')).toBeVisible()
    await page.locator('[data-open-teaching-workbench]').click()
    await expect(page).toHaveURL(/\/practicum\/teaching\//)
    await expect(page.locator('[data-teaching-workbench]')).toBeVisible()
  })

  test('[J-ADMIN-01] an owner can reach identifiable room settings, template, and competition pages', async ({ page }) => {
    await loginAsOwner(page)
    await page.goto('/practicum/room-settings')
    await expect(page.locator('[data-room-settings-page]')).toBeVisible()
    await page.goto('/practicum/templates')
    await expect(page.locator('[data-template-page]')).toBeVisible()
    await page.goto('/practicum/competitions')
    await expect(page.locator('[data-competition-page]')).toBeVisible()
  })

  test('[J-STUDENT-01] a student can reach the competition and template surfaces granted by the server', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/practicum/competitions')
    await expect(page.locator('[data-competition-page]')).toBeVisible()
    await page.goto('/practicum/templates')
    await expect(page.locator('[data-template-page]')).toBeVisible()
    await expect(page.locator('[data-template-list]')).toBeVisible()
  })
})

// npm.cmd run test:e2e:isolated
