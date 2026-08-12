import { expect, test, type Browser, type Page } from '@playwright/test'
import { csrfHeaders } from './csrf'
import { loginAsOwner, loginAsStudent } from './auth-helpers'

interface ReviewFixture {
  activityId: string
  activityTitle: string
  planId: string
  unitId: string
}

async function createReviewFixture(page: Page, browser: Browser, label: string): Promise<ReviewFixture> {
  await loginAsOwner(page)
  const key = `page-closure-${label}-${Date.now()}`
  const planResponse = await page.request.post('/api/practicum/plans', {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-plan` }),
    data: { roomId: 'room-001', title: `Page closure plan ${label}`, description: 'Review page closure fixture.' },
  })
  expect(planResponse.status()).toBe(201)
  const plan = (await planResponse.json()).plan

  const moduleResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(page),
    data: { title: `Page closure module ${label}`, level: 1, parentId: null, version: plan.version },
  })
  expect(moduleResponse.status()).toBe(201)
  const moduleSnapshot = await moduleResponse.json()
  const module = moduleSnapshot.nodes.find((node: { level: number }) => node.level === 1)

  const unitResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(page),
    data: { title: `Page closure unit ${label}`, level: 2, parentId: module.id, version: moduleSnapshot.plan.version },
  })
  expect(unitResponse.status()).toBe(201)
  const unitSnapshot = await unitResponse.json()

  const activityTitle = `Page closure activity ${label}`
  const activityResponse = await page.request.post(`/api/practicum/plans/${plan.id}/activities`, {
    headers: await csrfHeaders(page),
    data: { parentId: unitSnapshot.nodes.find((node: { level: number }) => node.level === 2).id, title: activityTitle, type: 'PRACTICE_ACTIVITY', version: unitSnapshot.plan.version },
  })
  expect(activityResponse.status()).toBe(201)
  const activity = (await activityResponse.json()).nodes.find((node: { title: string }) => node.title === activityTitle)

  const published = await page.request.post(`/api/practicum/plans/${plan.id}/publish`, { headers: await csrfHeaders(page) })
  expect(published.status()).toBe(200)

  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  const submitted = await student.request.post('/api/practicum/submissions', {
    headers: await csrfHeaders(student, { 'Idempotency-Key': `${key}-submission` }),
    data: { activityId: activity.id, text: `Evidence ${label}` },
  })
  expect(submitted.status()).toBe(201)
  await studentContext.close()

  return { activityId: activity.id, activityTitle, planId: plan.id, unitId: unitSnapshot.nodes.find((node: { level: number }) => node.level === 2).id }
}

test('批改下一个只在当前审核筛选范围内导航', async ({ page, browser }) => {
  const scoped = await createReviewFixture(page, browser, 'scoped')
  await createReviewFixture(page, browser, 'outside')
  await loginAsOwner(page)
  await page.goto('/practicum/reviews')

  await page.locator('[data-plan-filter]').selectOption(scoped.planId)
  const row = page.locator('[data-review-row]').filter({ hasText: scoped.activityTitle })
  await expect(row).toHaveCount(1)
  const detailLink = row.locator('a[href*="/practicum/submissions/"]')
  await expect(detailLink).toHaveAttribute('href', new RegExp(`planId=${scoped.planId}`))
  await detailLink.click()

  await expect(page.locator('[data-submission-detail]')).toBeVisible()
  await expect(page.locator('[data-next-review]')).toHaveCount(0)
})

test('学生访问审核列表和提交详情均显示 forbidden', async ({ page, browser }) => {
  const fixture = await createReviewFixture(page, browser, 'forbidden')
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()

  await page.goto('/practicum/reviews')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-review-queue]')).toHaveCount(0)

  await page.goto(`/practicum/submissions/${fixture.activityId}`)
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-submission-detail]')).toHaveCount(0)
})

test('审核列表在 390px 视口内保持成功状态且没有横向溢出', async ({ page, browser }) => {
  await createReviewFixture(page, browser, 'mobile')
  await loginAsOwner(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/practicum/reviews')

  await expect(page.locator('[data-review-queue]')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
