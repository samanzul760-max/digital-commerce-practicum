import { expect, test } from '@playwright/test'
import { prisma } from '../../../server/db/client'
import { loginAsTeacher } from './auth-helpers'

test('[SB-T-06] teacher creates a class, enrolls a student, and reaches its task publishing workspace', async ({ page }) => {
  const cohort = await prisma.cohort.create({
    data: {
      organizationId: 'org-demo',
      name: `UI cohort ${Date.now()}`,
      startsAt: new Date('2026-08-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T00:00:00.000Z'),
    },
  })
  const className = `商品运营一班 ${Date.now()}`
  await loginAsTeacher(page)
  await page.goto('/practicum/classes')

  await expect(page.locator('[data-teacher-classes-link]')).toBeVisible()
  await expect(page.locator('[data-class-list]')).toBeVisible()
  await page.locator('[data-open-create-class]').click()
  await page.locator('[data-class-name]').fill(className)
  await expect(page.locator(`[data-class-cohort] option[value="${cohort.id}"]`)).toHaveCount(1)
  await page.locator('[data-class-cohort]').selectOption(cohort.id)
  await page.locator('[data-create-class]').click()

  const classRow = page.locator('[data-class-row]').filter({ hasText: className })
  await expect(classRow).toHaveCount(1)
  await classRow.locator('[data-open-class]').click()
  await expect(page.locator('[data-class-detail]')).toBeVisible()

  await page.locator('[data-student-roster]').selectOption('user-student-001')
  await page.locator('[data-enroll-student]').click()
  await expect(page.locator('[data-class-member]').filter({ hasText: 'user-student-001' })).toHaveCount(1)
  await expect(page.locator('[data-publish-assignment]')).toBeVisible()
})
