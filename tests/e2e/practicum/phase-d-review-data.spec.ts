import { expect, test, type Page } from '@playwright/test'
import { PrismaClient, UserRole } from '@prisma/client'
import { randomBytes, scryptSync } from 'node:crypto'
import { csrfHeaders } from './csrf'

let sequence = 0

async function login(page: Page, role: 'ADMIN' | 'STUDENT') {
  return loginWithCredentials(
    page,
    role === 'ADMIN' ? 'admin' : 'student1',
    role === 'ADMIN' ? process.env.SEED_ADMIN_PASSWORD : process.env.SEED_STUDENT1_PASSWORD,
  )
}

async function loginWithCredentials(page: Page, identifier: string, password: string | undefined) {
  await page.context().clearCookies()
  const response = await page.request.post('/api/auth/login', {
    data: { identifier, password },
  })
  expect(response.status()).toBe(200)
}

async function seedSameRoomNonTeacherAdmin() {
  const prisma = new PrismaClient()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!password) throw new Error('SEED_ADMIN_PASSWORD is required for the Phase D authorization test.')
  const passwordSalt = randomBytes(16).toString('hex')
  try {
    const user = await prisma.user.upsert({
      where: { identifier: 'phase-d-outsider' },
      update: { displayName: 'Phase D Outsider', role: UserRole.ADMIN, enabled: true, passwordSalt, passwordHash: scryptSync(password, passwordSalt, 32).toString('hex') },
      create: { identifier: 'phase-d-outsider', displayName: 'Phase D Outsider', role: UserRole.ADMIN, passwordSalt, passwordHash: scryptSync(password, passwordSalt, 32).toString('hex') },
    })
    await prisma.userRoleGrant.upsert({ where: { userId_role: { userId: user.id, role: UserRole.ADMIN } }, update: {}, create: { userId: user.id, role: UserRole.ADMIN } })
    await prisma.classEnrollment.upsert({
      where: { classId_userId: { classId: 'class-e2e-001', userId: user.id } },
      update: { role: 'STUDENT', active: true },
      create: { classId: 'class-e2e-001', userId: user.id, role: 'STUDENT', active: true },
    })
  } finally {
    await prisma.$disconnect()
  }
}

async function submittedStoreTask(page: Page) {
  sequence += 1
  const suffix = `${sequence}-${Date.now()}`
  await login(page, 'ADMIN')
  const created = await page.request.post('/api/admin/tasks', {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `phase-d-create-${suffix}` }),
    data: { classId: 'class-e2e-001', title: `阶段 D 批阅工单 ${suffix}`, description: '用于验证批阅、评分与学情数据。' },
  })
  expect(created.status()).toBe(201)
  const taskId = (await created.json()).task.id as string
  const sections = [
    { clientKey: 'root', type: 'WORK_ORDER', title: '批阅验证工单', description: '', sort: 0, required: true, weightPercent: 0 },
    {
      clientKey: 'store', parentClientKey: 'root', type: 'SANDBOX', title: '店铺基础', description: '', sort: 1, required: true, weightPercent: 100,
      sandbox: {
        sandboxType: 'STORE_BASICS', appKey: 'store-basics',
        steps: [{ title: '完成店铺设置', instruction: '保存店铺设置。', sort: 0, required: true, fields: [], evidenceKey: 'store-result' }],
        rubricItems: [{ title: '店铺设置完整', description: '店铺基础信息与运费模板均已保存。', points: 100, sort: 0 }],
      },
    },
  ]
  const updated = await page.request.patch(`/api/admin/tasks/${taskId}`, {
    headers: await csrfHeaders(page),
    data: { autoScoreWeight: 70, manualScoreWeight: 30, sections },
  })
  expect(updated.status()).toBe(200)
  const published = await page.request.post(`/api/admin/tasks/${taskId}/publish`, {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `phase-d-publish-${suffix}` }),
    data: { classId: 'class-e2e-001', availableAt: '2026-08-10T00:00:00.000Z', dueAt: '2026-12-31T23:59:59.000Z', lateAllowed: false },
  })
  expect(published.status()).toBe(201)

  await login(page, 'STUDENT')
  const assignments = await page.request.get('/api/center/assignments?status=AVAILABLE')
  const studentTask = ((await assignments.json()).assignments as Array<{ id: string; assignmentId: string }>).find(item => item.assignmentId === taskId)
  expect(studentTask).toBeTruthy()
  const studentTaskId = studentTask!.id
  expect((await page.request.post(`/api/center/student-tasks/${studentTaskId}/start`, { headers: await csrfHeaders(page) })).status()).toBe(200)
  const detail = await page.request.get(`/api/center/student-tasks/${studentTaskId}`)
  const section = ((await detail.json()).sections as Array<{ id: string; sandbox?: { steps: Array<{ id: string }> } }>).find(item => item.sandbox)
  expect(section).toBeTruthy()
  const draft = await page.request.post(`/api/center/student-tasks/${studentTaskId}/draft`, {
    headers: await csrfHeaders(page),
    data: { sectionId: section!.id, completedStepIds: section!.sandbox!.steps.map(step => step.id), values: { result: '完成', storeName: '教学演示店', businessCategory: '校园服务', withdrawalAccount: '62220001', freightTemplateName: '全国包邮', freightChargeType: 'PIECE' } },
  })
  expect(draft.status()).toBe(200)
  expect((await page.request.post(`/api/center/student-tasks/${studentTaskId}/submissions`, { headers: await csrfHeaders(page, { 'Idempotency-Key': `phase-d-submit-${suffix}` }) })).status()).toBe(201)
  return studentTaskId
}

test.describe.serial('LearnEC Phase D review, grading, and data closure', () => {
  test('ADMIN reviews evidence, persists weighted grade revisions, and downloads real xlsx', async ({ page }) => {
    const studentTaskId = await submittedStoreTask(page)
    await login(page, 'ADMIN')
    const queue = await page.request.get('/api/admin/reviews?status=SUBMITTED')
    expect(queue.status()).toBe(200)
    expect(((await queue.json()).items as Array<{ studentTaskId: string }>).some(item => item.studentTaskId === studentTaskId)).toBe(true)

    const detail = await page.request.get(`/api/admin/reviews/${studentTaskId}`)
    expect(detail.status()).toBe(200)
    expect((await detail.json()).evidence.snapshots.length).toBeGreaterThan(0)

    const gradeHeaders = await csrfHeaders(page)
    const firstGrade = await page.request.post(`/api/admin/reviews/${studentTaskId}/grade`, { headers: gradeHeaders, data: { manualScore: 80, feedback: '证据完整，继续保持。', expectedVersion: 1 } })
    expect(firstGrade.status()).toBe(200)
    expect((await firstGrade.json()).grade).toMatchObject({ autoScore: 100, manualScore: 80, score: 94 })
    const revision = await page.request.post(`/api/admin/reviews/${studentTaskId}/grade`, { headers: gradeHeaders, data: { manualScore: 90, feedback: '修订人工分。', expectedVersion: 1 } })
    expect(revision.status()).toBe(200)
    expect((await revision.json()).grade).toMatchObject({ manualScore: 90, score: 97, revisionCount: 2 })

    await page.goto('/admin/reviews')
    await expect(page.locator('[data-review-center]')).toBeVisible()
    await expect(page.locator('[data-review-queue]')).toBeVisible()
    await expect(page.locator('[data-review-evidence]')).toBeVisible()
    await expect(page.locator('[data-review-grading]')).toBeVisible()

    const analytics = await page.request.get('/api/admin/data?classId=class-e2e-001')
    expect(analytics.status()).toBe(200)
    expect((await analytics.json()).overview.gradedCount).toBeGreaterThan(0)
    const exportResponse = await page.request.get('/api/admin/data/export?classId=class-e2e-001')
    expect(exportResponse.status()).toBe(200)
    expect(exportResponse.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect((await exportResponse.body()).subarray(0, 2).toString()).toBe('PK')
    await page.goto('/admin/data')
    await expect(page.locator('[data-admin-data]')).toBeVisible()
  })

  test('ADMIN must give feedback before returning a submitted task', async ({ page }) => {
    const studentTaskId = await submittedStoreTask(page)
    await login(page, 'ADMIN')
    const missingFeedback = await page.request.post(`/api/admin/reviews/${studentTaskId}/return`, { headers: await csrfHeaders(page), data: { feedback: '', expectedVersion: 1 } })
    expect(missingFeedback.status()).toBe(422)
    const returned = await page.request.post(`/api/admin/reviews/${studentTaskId}/return`, { headers: await csrfHeaders(page), data: { feedback: '请补充运费模板的证据。', expectedVersion: 1 } })
    expect(returned.status()).toBe(200)
    expect((await returned.json()).task.status).toBe('RETURNED')

    await login(page, 'STUDENT')
    const resubmitted = await page.request.post(`/api/center/student-tasks/${studentTaskId}/submissions`, { headers: await csrfHeaders(page, { 'Idempotency-Key': `phase-d-resubmit-${Date.now()}` }) })
    expect(resubmitted.status()).toBe(201)
    expect((await resubmitted.json()).submission.currentVersion).toBe(2)
  })

  test('review APIs reject students and hide a class from a same-room non-teacher ADMIN', async ({ page }) => {
    const studentTaskId = await submittedStoreTask(page)
    await login(page, 'STUDENT')
    expect((await page.request.get('/api/admin/reviews?status=SUBMITTED')).status()).toBe(403)

    await seedSameRoomNonTeacherAdmin()
    await loginWithCredentials(page, 'phase-d-outsider', process.env.SEED_ADMIN_PASSWORD)
    const queue = await page.request.get('/api/admin/reviews?status=SUBMITTED')
    expect(queue.status()).toBe(200)
    expect(((await queue.json()).items as Array<{ studentTaskId: string }>).some(item => item.studentTaskId === studentTaskId)).toBe(false)
  })

  test('a grade and return race cannot both update a submitted task', async ({ page }) => {
    const studentTaskId = await submittedStoreTask(page)
    await login(page, 'ADMIN')
    const headers = await csrfHeaders(page)
    const [graded, returned] = await Promise.all([
      page.request.post(`/api/admin/reviews/${studentTaskId}/grade`, { headers, data: { manualScore: 80, feedback: 'concurrent grade', expectedVersion: 1 } }),
      page.request.post(`/api/admin/reviews/${studentTaskId}/return`, { headers, data: { feedback: 'concurrent return', expectedVersion: 1 } }),
    ])
    expect([graded.status(), returned.status()].sort()).toEqual([200, 409])
  })

  test('review and data pages do not overflow at 390px', async ({ page }) => {
    await login(page, 'ADMIN')
    await page.setViewportSize({ width: 390, height: 844 })
    for (const route of ['/admin/reviews', '/admin/data']) {
      await page.goto(route)
      expect(await page.locator('html').evaluate(node => node.scrollWidth - node.clientWidth)).toBe(0)
    }
  })
})
