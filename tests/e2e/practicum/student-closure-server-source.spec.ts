import { expect, test, type Page } from '@playwright/test'
import { csrfHeaders } from './csrf'
import { loginAsOwner, loginAsStudent, loginAsTeacher } from './auth-helpers'

const FEATURE_ID = '[BDD-STUDENT-SERVER-SOURCE-001]'

async function createPublishedActivity(owner: Page, label: string) {
  const key = `student-server-source-${label}-${Date.now()}`
  const planResponse = await owner.request.post('/api/practicum/plans', {
    headers: await csrfHeaders(owner, { 'Idempotency-Key': `${key}-plan` }),
    data: { roomId: 'room-001', title: `Student server source ${label}`, description: 'Isolated server-source fixture.' },
  })
  expect(planResponse.status()).toBe(201)
  const plan = (await planResponse.json()).plan

  const moduleResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(owner),
    data: { title: `Server source module ${label}`, level: 1, parentId: null, version: plan.version },
  })
  expect(moduleResponse.status()).toBe(201)
  const moduleSnapshot = await moduleResponse.json()
  const module = moduleSnapshot.nodes.find((node: { level: number }) => node.level === 1)

  const unitResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(owner),
    data: { title: `Server source unit ${label}`, level: 2, parentId: module.id, version: moduleSnapshot.plan.version },
  })
  expect(unitResponse.status()).toBe(201)
  const unitSnapshot = await unitResponse.json()

  const activityResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/activities`, {
    headers: await csrfHeaders(owner),
    data: { parentId: unitSnapshot.nodes.find((node: { level: number }) => node.level === 2).id, title: `Server source activity ${label}`, type: 'PRACTICE_ACTIVITY', version: unitSnapshot.plan.version },
  })
  expect(activityResponse.status()).toBe(201)
  const activity = (await activityResponse.json()).nodes.find((node: { level: number }) => node.level === 3)
  expect((await owner.request.post(`/api/practicum/plans/${plan.id}/publish`, { headers: await csrfHeaders(owner) })).status()).toBe(200)
  return activity.id as string
}

async function submit(student: Page, activityId: string, text: string, key: string) {
  return student.request.post('/api/practicum/submissions', {
    headers: await csrfHeaders(student, { 'Idempotency-Key': key }),
    data: { activityId, text },
  })
}

test(`${FEATURE_ID} clearing browser state keeps the server submission visible`, async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  await loginAsOwner(owner)
  const activityId = await createPublishedActivity(owner, 'clear')
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  expect((await submit(student, activityId, 'Server submission survives browser state clearing.', `clear-${Date.now()}`)).status()).toBe(201)
  await student.goto('/practicum')
  await student.evaluate(() => window.localStorage.clear())
  const refreshed = await student.request.get(`/api/practicum/submissions/${activityId}`)
  expect(refreshed.status()).toBe(200)
  expect((await refreshed.json()).submission).toEqual(expect.objectContaining({ status: 'SUBMITTED', versions: expect.arrayContaining([expect.objectContaining({ version: 1 })]) }))
  await studentContext.close()
  await ownerContext.close()
})

test(`${FEATURE_ID} return requires feedback and persists after refresh`, async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  await loginAsOwner(owner)
  const activityId = await createPublishedActivity(owner, 'return')
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  expect((await submit(student, activityId, 'Submission requiring feedback.', `return-${Date.now()}`)).status()).toBe(201)
  const missingFeedback = await owner.request.post(`/api/practicum/submissions/${activityId}/return`, { headers: await csrfHeaders(owner), data: { feedback: ' ' } })
  expect(missingFeedback.status()).toBe(422)
  const returned = await owner.request.post(`/api/practicum/submissions/${activityId}/return`, { headers: await csrfHeaders(owner), data: { feedback: 'Please add the source evidence.' } })
  expect(returned.status()).toBe(200)
  await student.reload()
  const refreshed = await student.request.get(`/api/practicum/submissions/${activityId}`)
  expect((await refreshed.json()).submission).toEqual(expect.objectContaining({
    status: 'RETURNED',
    feedback: 'Please add the source evidence.',
    feedbackEntries: expect.arrayContaining([expect.objectContaining({ text: 'Please add the source evidence.' })]),
  }))
  await studentContext.close()
  await ownerContext.close()
})

test(`${FEATURE_ID} resubmission increments immutable versions`, async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  await loginAsOwner(owner)
  const activityId = await createPublishedActivity(owner, 'version')
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  expect((await submit(student, activityId, 'Immutable version one.', `version-one-${Date.now()}`)).status()).toBe(201)
  expect((await owner.request.post(`/api/practicum/submissions/${activityId}/return`, { headers: await csrfHeaders(owner), data: { feedback: 'Revise the evidence.' } })).status()).toBe(200)
  const revision = await submit(student, activityId, 'Immutable version two.', `version-two-${Date.now()}`)
  expect(revision.status()).toBe(201)
  const versions = (await revision.json()).submission.versions
  expect(versions.map((version: { version: number }) => version.version).sort()).toEqual([1, 2])
  expect(versions.find((version: { version: number }) => version.version === 1).text).toBe('Immutable version one.')
  await student.reload()
  const refreshed = await student.request.get(`/api/practicum/submissions/${activityId}`)
  expect((await refreshed.json()).submission.versions).toEqual(expect.arrayContaining([expect.objectContaining({ version: 1, text: 'Immutable version one.' }), expect.objectContaining({ version: 2, text: 'Immutable version two.' })]))
  await studentContext.close()
  await ownerContext.close()
})

test(`${FEATURE_ID} unauthorized role cannot read or mutate a student submission`, async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  await loginAsOwner(owner)
  const activityId = await createPublishedActivity(owner, 'permission')
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  expect((await submit(student, activityId, 'Private student submission.', `permission-${Date.now()}`)).status()).toBe(201)
  const teacherContext = await browser.newContext()
  const teacher = await teacherContext.newPage()
  await loginAsTeacher(teacher)
  const read = await teacher.request.get(`/api/practicum/submissions/${activityId}`)
  expect(read.status()).toBe(403)
  expect((await read.json()).submission).toBeUndefined()
  const mutate = await teacher.request.post(`/api/practicum/submissions/${activityId}/return`, { headers: await csrfHeaders(teacher), data: { feedback: 'Unauthorized mutation.' } })
  expect(mutate.status()).toBe(403)
  const unchanged = await student.request.get(`/api/practicum/submissions/${activityId}`)
  expect((await unchanged.json()).submission.status).toBe('SUBMITTED')
  await teacherContext.close()
  await studentContext.close()
  await ownerContext.close()
})

test(`${FEATURE_ID} learning page shows server error instead of local plan fallback`, async ({ page }) => {
  await loginAsStudent(page)
  await page.route('**/api/practicum/plans/plan-wdds', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'service unavailable' }),
  }))

  await page.goto('/practicum/learn/plan-wdds')

  await expect(page.locator('[data-server-error]')).toBeVisible()
  await expect(page.locator('[data-learn-plan]')).toHaveCount(0)
})

test(`${FEATURE_ID} task deadline comes from the server task DTO`, async ({ page }) => {
  await loginAsStudent(page)
  await page.route('**/api/practicum/student/tasks', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [{
      id: 'server-task-deadline',
      planAssignmentId: 'server-assignment-deadline',
      activityId: 'activity-deadline',
      status: 'AVAILABLE',
      availability: 'AVAILABLE',
      availableAt: '2026-08-01T00:00:00.000Z',
      dueAt: '2026-08-15T00:00:00.000Z',
      source: { id: 'server-assignment-deadline', title: '服务端截止日期任务', status: 'PUBLISHED' },
    }] }),
  }))
  await page.goto('/practicum')
  await page.evaluate(() => {
    const key = 'digital-commerce-practicum.v1'
    const current = JSON.parse(localStorage.getItem(key) || '{}')
    localStorage.setItem(key, JSON.stringify({ ...current, planDeadlines: { 'plan-wdds': '2099-01-01T00:00:00.000Z' } }))
  })
  await page.reload()

  await page.goto('/practicum/tasks')

  await expect(page.locator('[data-student-task-row]')).toHaveCount(1)
  await expect(page.locator('[data-student-task-row]')).toContainText('服务端截止日期任务')
  await expect(page.locator('[data-student-task-row] a')).toHaveAttribute('href', '/practicum/activities/activity-deadline?taskId=server-task-deadline')
  await expect(page.locator('[data-task-metrics]')).toContainText('8月15日')
  await expect(page.locator('[data-task-metrics]')).not.toContainText('1月1日')
})

test(`${FEATURE_ID} activity page renders task context when browser business state is empty`, async ({ page }) => {
  await loginAsStudent(page)
  await page.route('**/api/practicum/student-tasks/server-context-task', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      task: {
        id: 'server-context-task',
        planId: 'plan-server-context',
        activityId: 'server-context-activity',
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        availableAt: '2026-08-01T00:00:00.000Z',
        dueAt: '2026-08-15T00:00:00.000Z',
        activity: { id: 'server-context-activity', title: 'server-context-activity' },
        source: { id: 'server-assignment-context', title: '服务端作业', status: 'PUBLISHED' },
      },
      submission: null,
      returnedFeedback: null,
    }),
  }))
  await page.route('**/api/practicum/plans/plan-server-context', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      plan: { id: 'plan-server-context', title: '服务端学习计划', description: '', status: 'PUBLISHED', roomId: 'room-001', sort: 1, moduleIds: [], createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' },
      nodes: [{ id: 'server-context-activity', planId: 'plan-server-context', parentId: null, level: 3, title: '服务端实操活动', description: '', sort: 1, activityId: 'server-context-activity', activityType: 'PRACTICE_ACTIVITY' }],
      activities: [{ id: 'server-context-activity', title: '服务端实操活动', type: 'PRACTICE_ACTIVITY', objective: '只通过服务端任务上下文展示活动。', instructions: ['整理证据并提交成果。'], required: true, resourceIds: [], config: { type: 'PRACTICE_ACTIVITY', deliverables: ['一份分析结论'], rubric: [] } }],
    }),
  }))
  await page.goto('/practicum')
  await page.evaluate(() => localStorage.setItem('digital-commerce-practicum.v1', JSON.stringify({
    schemaVersion: 1,
    activeRole: 'OWNER',
    learningPosition: {},
    softwareAttempts: {},
    trainingAttempts: {},
    practiceDrafts: {},
    practiceSubmissions: {},
    planDeadlines: {},
    lockedActivityIds: [],
    notifications: [],
    room: { id: 'room-001', title: '', description: '', organizationId: 'org-demo', planIds: [], status: 'ONLINE', teachingMode: 'SELF_DIRECTED' },
    plans: [],
    nodes: [],
    activities: [],
    resources: [],
    members: [],
  })))

  await page.goto('/practicum/activities/server-context-activity?taskId=server-context-task')

  await expect(page.locator('[data-activity-page]')).toBeVisible()
  await expect(page.locator('[data-activity-page]')).toContainText('服务端实操活动')
  await expect(page.locator('[data-activity-page]')).toContainText('只通过服务端任务上下文展示活动。')
})
