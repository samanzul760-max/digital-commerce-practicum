import { expect, test, type Browser, type Page } from '@playwright/test'
import { csrfHeaders } from './csrf'
import { loginAsOwner, loginAsStudent } from './auth-helpers'

interface ReviewFixture {
  activityId: string
  activityTitle: string
  planId: string
  unitId: string
}

async function selectRole(page: Page, role: 'OWNER' | 'STUDENT') {
  if (role === 'OWNER') await loginAsOwner(page)
  else await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator(`[data-role-option="${role}"]`).click()
}

async function getSubmission(page: Page, activityId: string) {
  const response = await page.request.get(`/api/practicum/submissions/${activityId}`)
  expect(response.status()).toBe(200)
  return await response.json()
}

async function createReviewFixture(page: Page, browser: Browser, label: string, returned = false): Promise<ReviewFixture> {
  await loginAsOwner(page)
  const key = `review-${label}-${Date.now()}`
  const planResponse = await page.request.post('/api/practicum/plans', {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-plan` }),
    data: { roomId: 'room-001', title: `Review plan ${label}`, description: 'Server-backed review fixture.' },
  })
  expect(planResponse.status()).toBe(201)
  const plan = (await planResponse.json()).plan

  const moduleResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(page),
    data: { title: `Module ${label}`, level: 1, parentId: null, version: plan.version },
  })
  expect(moduleResponse.status()).toBe(201)
  const moduleSnapshot = await moduleResponse.json()
  const module = moduleSnapshot.nodes.find((node: { level: number }) => node.level === 1)

  const unitResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(page),
    data: { title: `Unit ${label}`, level: 2, parentId: module.id, version: moduleSnapshot.plan.version },
  })
  expect(unitResponse.status()).toBe(201)
  const unitSnapshot = await unitResponse.json()
  const unit = unitSnapshot.nodes.find((node: { level: number }) => node.level === 2)

  const activityTitle = `Practice ${label}`
  const activityResponse = await page.request.post(`/api/practicum/plans/${plan.id}/activities`, {
    headers: await csrfHeaders(page),
    data: { parentId: unit.id, title: activityTitle, type: 'PRACTICE_ACTIVITY', version: unitSnapshot.plan.version },
  })
  expect(activityResponse.status()).toBe(201)
  const activitySnapshot = await activityResponse.json()
  const activity = activitySnapshot.nodes.find((node: { title: string }) => node.title === activityTitle)

  const published = await page.request.post(`/api/practicum/plans/${plan.id}/publish`, { headers: await csrfHeaders(page) })
  expect(published.status()).toBe(200)

  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  const submitted = await student.request.post('/api/practicum/submissions', {
    headers: await csrfHeaders(student, { 'Idempotency-Key': `${key}-submission` }),
    data: { activityId: activity.id, text: `Submission ${label}` },
  })
  expect(submitted.status()).toBe(201)
  await studentContext.close()

  if (returned) {
    const returnedResponse = await page.request.post(`/api/practicum/submissions/${activity.id}/return`, {
      headers: await csrfHeaders(page),
      data: { feedback: `Return feedback ${label}` },
    })
    expect(returnedResponse.status()).toBe(200)
  }

  return { activityId: activity.id, activityTitle, planId: plan.id, unitId: unit.id }
}

test('owner sees complete server-backed submission fields in the review queue', async ({ page, browser }) => {
  const fixture = await createReviewFixture(page, browser, 'queue')
  await selectRole(page, 'OWNER')
  await page.goto('/practicum/reviews')

  const row = page.locator('[data-review-row]').filter({ hasText: fixture.activityTitle })
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('Review plan queue')
  await expect(row).toContainText('Unit queue')
  await expect(row).toContainText(fixture.activityTitle)
  await expect(row.locator('[data-submitted-time]')).not.toBeEmpty()
  await expect(row.locator('[data-review-status]')).toHaveText('待审核')
})

test('owner filters a server-backed review queue by plan, unit, status, and learner', async ({ page, browser }) => {
  const returnedFixture = await createReviewFixture(page, browser, 'filtered-returned', true)
  await createReviewFixture(page, browser, 'unfiltered-pending')
  await selectRole(page, 'OWNER')
  await page.goto('/practicum/reviews')

  await page.locator('[data-plan-filter]').selectOption(returnedFixture.planId)
  await page.locator('[data-unit-filter]').selectOption(returnedFixture.unitId)
  await page.locator('[data-status-filter]').selectOption('RETURNED')
  await page.locator('[data-student-filter]').fill('实训学生')
  const row = page.locator('[data-review-row]')
  await expect(row).toHaveCount(1)
  await expect(row).toContainText(returnedFixture.activityTitle)
  await expect(row.locator('[data-review-status]')).toHaveText('已退回')
})

test('owner return requires feedback and persists server evidence', async ({ page, browser }) => {
  const fixture = await createReviewFixture(page, browser, 'return')
  await selectRole(page, 'OWNER')
  await page.goto(`/practicum/submissions/${fixture.activityId}`)

  await page.locator('[data-return-action]').click()
  await expect(page.locator('[data-return-feedback-error]')).toHaveText('请输入退回反馈。')
  await page.locator('[data-return-feedback]').fill('Please add supporting evidence.')
  await page.locator('[data-return-action]').click()
  await page.locator('[data-return-confirmation] [data-confirm-return]').click()
  await expect(page.locator('[data-detail-status]')).toHaveText('已退回')

  const detail = await getSubmission(page, fixture.activityId)
  expect(detail.submission.status).toBe('RETURNED')
  expect(detail.submission.feedbackEntries).toHaveLength(1)
  expect(detail.submission.feedbackEntries[0].text).toBe('Please add supporting evidence.')
})

test('student revision preserves returned server evidence', async ({ page, browser }) => {
  const fixture = await createReviewFixture(page, browser, 'revision', true)
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  const response = await student.request.post('/api/practicum/submissions', {
    headers: await csrfHeaders(student, { 'Idempotency-Key': `revision-${Date.now()}` }),
    data: { activityId: fixture.activityId, text: 'Revision with supporting evidence.' },
  })
  expect(response.status()).toBe(201)
  await studentContext.close()

  await loginAsOwner(page)
  const detail = await getSubmission(page, fixture.activityId)
  expect(detail.submission.status).toBe('SUBMITTED')
  expect(detail.submission.versions.map((version: { version: number }) => version.version)).toEqual([1, 2])
  expect(detail.submission.feedbackEntries[0].version).toBe(1)
})

test('owner cannot grade an incomplete rubric and can finalize a complete review', async ({ page, browser }) => {
  const fixture = await createReviewFixture(page, browser, 'grade')
  await selectRole(page, 'OWNER')
  await page.goto(`/practicum/submissions/${fixture.activityId}`)
  await page.getByLabel('评分反馈').fill('Complete review for an empty optional rubric.')
  await page.locator('[data-finalize-grade]').click()
  await page.locator('[data-grade-confirmation] [data-confirm-grade]').click()
  await expect(page.locator('[data-detail-status]')).toHaveText('已评分')

  const detail = await getSubmission(page, fixture.activityId)
  expect(detail.submission.status).toBe('GRADED')
  expect(detail.submission.grade.reviewerId).toBe('user-owner-001')
})

test('student cannot access server-backed review data and queue controls', async ({ page, browser }) => {
  const fixture = await createReviewFixture(page, browser, 'forbidden')
  await selectRole(page, 'STUDENT')
  await page.goto('/practicum/reviews')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-review-row]')).toHaveCount(0)

  await page.goto(`/practicum/submissions/${fixture.activityId}`)
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-submission-detail]')).toHaveCount(0)
})

test('review scope controls preserve configured filters when the result set changes', async ({ page, browser }) => {
  const fixture = await createReviewFixture(page, browser, 'scope')
  await selectRole(page, 'OWNER')
  await page.goto('/practicum/reviews')
  await page.locator('[data-plan-filter]').selectOption(fixture.planId)
  await page.locator('[data-unit-filter]').selectOption(fixture.unitId)
  await page.locator('[data-student-filter]').fill('实训学生')
  await page.locator('[data-sort-order]').selectOption('newest')
  await expect(page.locator('[data-review-row]')).toHaveCount(1)

  await page.locator('[data-review-scope="CLASSROOM"]').click()
  await expect(page.locator('[data-empty]')).toBeVisible()
  await page.locator('[data-review-scope="PLAN"]').click()
  await expect(page.locator('[data-review-row]')).toHaveCount(1)
  await expect(page.locator('[data-plan-filter]')).toHaveValue(fixture.planId)
  await expect(page.locator('[data-unit-filter]')).toHaveValue(fixture.unitId)
  await expect(page.locator('[data-student-filter]')).toHaveValue('实训学生')
  await expect(page.locator('[data-sort-order]')).toHaveValue('newest')
})
