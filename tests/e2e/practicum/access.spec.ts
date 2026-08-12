import { expect, test } from '@playwright/test'
import { loginAsOwner, loginAsStudent, loginAsTeacher } from './auth-helpers'

/**
 * Given a student selects the Student demo role
 * When the plan list is rendered
 * Then draft plans and plan-management actions are unavailable
 */
test('[CASE-S1-002] student cannot see draft plans or manage plans', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // 已发布计划通过学生首页的课程入口可见
  await expect(page.locator('[data-student-home] .current-plan-strip')).toContainText('网店运营')
  await expect(page.locator('[data-course-card]').first()).toBeVisible()
  // 草稿计划不可见
  await expect(page.locator('[data-plan-link][data-plan-id="plan-wdsj"]')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /网店视觉设计/ })).toHaveCount(0)
  // 无管理操作
  await expect(page.locator('[data-action="edit-plan"], [data-action="publish-plan"]')).toHaveCount(0)
})

/**
 * Given a student attempts to open a plan editor URL directly
 * When the student navigates to /practicum/plans/:planId/edit
 * Then the page shows a clear forbidden message and does not expose editing controls
 */
test('[ORIGINAL-S2-002] student is blocked from the plan editor with a clear forbidden message', async ({ page }) => {
  await loginAsStudent(page)
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
  await loginAsStudent(page)
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
  await loginAsStudent(page)
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

/**
 * Given an owner opens the workspace
 * When the owner clicks the plan list entry
 * Then the real plan list route opens
 */
test('[CASE-S2-003] owner can open the real plan list page from the workspace', async ({ page }) => {
  await loginAsOwner(page)
  await page.goto('/practicum')

  await page.locator('[data-owner-home] a[href="/practicum/plans"]').click()

  await expect(page).toHaveURL('/practicum/plans')
  await expect(page.locator('[data-plan-list-page]')).toBeVisible()
  expect(await page.locator('[data-plan-row]').count()).toBeGreaterThan(0)
})

test('[TASK-4] teacher can view scoped classroom, progress, and review entry points', async ({ page }) => {
  await loginAsTeacher(page)

  await page.goto('/practicum/classes')
  await expect(page.locator('[data-class-list], [data-class-page]')).toBeVisible()
  await expect(page.locator('[data-forbidden]')).toHaveCount(0)

  await page.goto('/practicum/progress')
  await expect(page.locator('[data-student-growth]')).toBeVisible()
  await expect(page.locator('[data-forbidden]')).toHaveCount(0)

  await page.goto('/practicum/reviews')
  await expect(page.locator('[data-review-page], [data-review-queue]')).toBeVisible()
  await expect(page.locator('[data-forbidden]')).toHaveCount(0)
})

test('[TASK-4] teacher cannot edit plans, manage members, or change room settings', async ({ page }) => {
  await loginAsTeacher(page)

  for (const route of ['/practicum/plans/plan-wdsj/edit', '/practicum/members', '/practicum/room-settings']) {
    await page.goto(route)
    await expect(page.locator('[data-forbidden]')).toBeVisible()
  }
})

test('[TASK-4] student cannot view teacher review or admin data', async ({ page }) => {
  await loginAsStudent(page)

  for (const route of ['/practicum/reviews', '/practicum/classes', '/practicum/members', '/practicum/room-settings']) {
    await page.goto(route)
    await expect(page.locator('[data-forbidden]')).toBeVisible()
  }
})

test('[TASK-4] unauthorized direct API writes return 403', async ({ page, browser }) => {
  await loginAsStudent(page)
  expect((await page.request.post('/api/practicum/plans', { data: { roomId: 'room-001', title: 'blocked' } })).status()).toBe(403)

  const teacherContext = await browser.newContext()
  const teacher = await teacherContext.newPage()
  await loginAsTeacher(teacher)
  expect((await teacher.request.post('/api/practicum/plans', { data: { roomId: 'room-001', title: 'blocked' } })).status()).toBe(403)
  expect((await teacher.request.patch('/api/practicum/members/member-unknown', { data: { role: 'OWNER' } })).status()).toBe(403)
  await teacherContext.close()
})
