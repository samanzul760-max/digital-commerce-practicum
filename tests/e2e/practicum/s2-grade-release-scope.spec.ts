import { expect, test, type Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { csrfHeaders } from './csrf'

let sequence = 0

async function login(page: Page, role: 'ADMIN' | 'STUDENT') {
  await page.context().clearCookies()
  const response = await page.request.post('/api/auth/login', {
    data: {
      identifier: role === 'ADMIN' ? 'admin' : 'student1',
      password: role === 'ADMIN' ? process.env.SEED_ADMIN_PASSWORD : process.env.SEED_STUDENT1_PASSWORD,
    },
  })
  expect(response.status()).toBe(200)
}

async function submittedTask(page: Page) {
  sequence += 1
  const suffix = `s2-${sequence}-${Date.now()}`
  await login(page, 'ADMIN')
  const created = await page.request.post('/api/admin/tasks', {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `s2-create-${suffix}` }),
    data: { classId: 'class-e2e-001', title: `S2 共享边界工单 ${suffix}`, description: '验证成绩发布与学生任务范围。' },
  })
  expect(created.status()).toBe(201)
  const assignmentId = (await created.json()).task.id as string
  const updated = await page.request.patch(`/api/admin/tasks/${assignmentId}`, {
    headers: await csrfHeaders(page),
    data: {
      autoScoreWeight: 70,
      manualScoreWeight: 30,
      sections: [
        { clientKey: 'root', type: 'WORK_ORDER', title: 'S2 工单', description: '', sort: 0, required: true, weightPercent: 0 },
        {
          clientKey: 'store', parentClientKey: 'root', type: 'SANDBOX', title: '店铺基础', description: '', sort: 1, required: true, weightPercent: 100,
          sandbox: {
            sandboxType: 'STORE_BASICS', appKey: 'store-basics',
            steps: [{ title: '完成设置', instruction: '保存设置。', sort: 0, required: true, fields: [], evidenceKey: 'store-result' }],
            rubricItems: [{ title: '设置完整', description: '信息完整。', points: 100, sort: 0 }],
          },
        },
      ],
    },
  })
  expect(updated.status()).toBe(200)
  const published = await page.request.post(`/api/admin/tasks/${assignmentId}/publish`, {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `s2-publish-${suffix}` }),
    data: { classId: 'class-e2e-001', availableAt: '2026-08-10T00:00:00.000Z', dueAt: '2026-12-31T23:59:59.000Z', lateAllowed: false },
  })
  expect(published.status()).toBe(201)

  await login(page, 'STUDENT')
  const assignments = await page.request.get('/api/center/assignments')
  expect(assignments.status()).toBe(200)
  const task = ((await assignments.json()).assignments as Array<{ id: string; assignmentId: string }>).find(item => item.assignmentId === assignmentId)
  expect(task).toBeTruthy()
  const studentTaskId = task!.id
  expect((await page.request.post(`/api/center/student-tasks/${studentTaskId}/start`, { headers: await csrfHeaders(page) })).status()).toBe(200)
  const detail = await page.request.get(`/api/center/student-tasks/${studentTaskId}`)
  const section = ((await detail.json()).sections as Array<{ id: string; sandbox?: { steps: Array<{ id: string }> } }>).find(item => item.sandbox)
  expect(section).toBeTruthy()
  expect((await page.request.post(`/api/center/student-tasks/${studentTaskId}/draft`, {
    headers: await csrfHeaders(page),
    data: {
      sectionId: section!.id,
      completedStepIds: section!.sandbox!.steps.map(step => step.id),
      values: { result: '完成', storeName: 'S2 教学店', businessCategory: '校园服务', withdrawalAccount: '62220001', freightTemplateName: '全国包邮', freightChargeType: 'PIECE' },
    },
  })).status()).toBe(200)
  expect((await page.request.post(`/api/center/student-tasks/${studentTaskId}/submissions`, {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `s2-submit-${suffix}` }),
  })).status()).toBe(201)
  return { assignmentId, studentTaskId, submissionKey: `s2-submit-${suffix}` }
}

async function studentReadBodies(page: Page, studentTaskId: string) {
  const [assignments, detail, compatibilityList, compatibilityDetail, progress] = await Promise.all([
    page.request.get('/api/center/assignments'),
    page.request.get(`/api/center/student-tasks/${studentTaskId}`),
    page.request.get('/api/practicum/student/tasks'),
    page.request.get(`/api/practicum/student-tasks/${studentTaskId}`),
    page.request.get('/api/practicum/progress'),
  ])
  for (const response of [assignments, detail, compatibilityList, compatibilityDetail, progress]) expect(response.status()).toBe(200)
  return {
    assignments: await assignments.json(),
    detail: await detail.json(),
    compatibilityList: await compatibilityList.json(),
    compatibilityDetail: await compatibilityDetail.json(),
    progress: await progress.json(),
  }
}

test.describe.serial('S2 grade release and student task scope', () => {
  test('unreleased grades never reach students and release or withdrawal changes visibility', async ({ page }) => {
    const { assignmentId, studentTaskId, submissionKey } = await submittedTask(page)
    const hiddenFeedback = `S2-HIDDEN-${Date.now()}`

    await login(page, 'ADMIN')
    const graded = await page.request.post(`/api/admin/reviews/${studentTaskId}/grade`, {
      headers: await csrfHeaders(page),
      data: { manualScore: 80, feedback: hiddenFeedback, expectedVersion: 1 },
    })
    expect(graded.status()).toBe(200)
    expect((await graded.json()).grade.releasedAt).toBeNull()

    await login(page, 'STUDENT')
    let bodies = await studentReadBodies(page, studentTaskId)
    expect(JSON.stringify(bodies)).not.toContain(hiddenFeedback)
    expect(bodies.detail.submission?.grade ?? null).toBeNull()
    expect(bodies.compatibilityDetail.submission?.grade ?? null).toBeNull()
    expect(bodies.progress.plans.find((item: { id: string }) => item.id === assignmentId)?.averageScore ?? null).toBeNull()
    const replay = await page.request.post(`/api/center/student-tasks/${studentTaskId}/submissions`, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': submissionKey }),
    })
    expect(replay.status()).toBe(200)
    expect(JSON.stringify(await replay.json())).not.toContain(hiddenFeedback)

    await login(page, 'ADMIN')
    const released = await page.request.post(`/api/admin/reviews/${studentTaskId}/grade/release`, { headers: await csrfHeaders(page) })
    expect(released.status()).toBe(200)
    expect((await released.json()).grade).toMatchObject({ score: 94, feedback: hiddenFeedback, releasedAt: expect.any(String), releasedById: expect.any(String) })

    await login(page, 'STUDENT')
    bodies = await studentReadBodies(page, studentTaskId)
    expect(bodies.detail.submission.grade).toMatchObject({ score: 94, feedback: hiddenFeedback, releasedAt: expect.any(String) })
    expect(bodies.compatibilityDetail.submission.grade).toMatchObject({ score: 94, feedback: hiddenFeedback, releasedAt: expect.any(String) })
    expect(bodies.progress.plans.find((item: { id: string }) => item.id === assignmentId)?.averageScore).toBe(94)

    await login(page, 'ADMIN')
    const withdrawn = await page.request.post(`/api/admin/reviews/${studentTaskId}/grade/withdraw`, { headers: await csrfHeaders(page) })
    expect(withdrawn.status()).toBe(200)
    expect((await withdrawn.json()).grade.releasedAt).toBeNull()
    const repeatedWithdrawal = await page.request.post(`/api/admin/reviews/${studentTaskId}/grade/withdraw`, { headers: await csrfHeaders(page) })
    expect(repeatedWithdrawal.status()).toBe(409)
    expect((await repeatedWithdrawal.json()).data.code).toBe('GRADE_NOT_RELEASED')

    await login(page, 'STUDENT')
    bodies = await studentReadBodies(page, studentTaskId)
    expect(JSON.stringify(bodies)).not.toContain(hiddenFeedback)

    await login(page, 'ADMIN')
    expect((await page.request.post(`/api/admin/reviews/${studentTaskId}/grade/release`, { headers: await csrfHeaders(page) })).status()).toBe(200)
    const revised = await page.request.post(`/api/admin/reviews/${studentTaskId}/grade`, {
      headers: await csrfHeaders(page),
      data: { manualScore: 90, feedback: `${hiddenFeedback}-REVISED`, expectedVersion: 1 },
    })
    expect(revised.status()).toBe(200)
    expect((await revised.json()).grade.releasedAt).toBeNull()

    await login(page, 'STUDENT')
    bodies = await studentReadBodies(page, studentTaskId)
    expect(JSON.stringify(bodies)).not.toContain(hiddenFeedback)
  })

  test('an assigned task is denied after its class enrollment becomes inactive even when room scope remains', async ({ page }) => {
    const { assignmentId, studentTaskId } = await submittedTask(page)
    const prisma = new PrismaClient()
    try {
      const student = await prisma.user.findUniqueOrThrow({ where: { identifier: 'student1' } })
      const sourceClass = await prisma.class.findUniqueOrThrow({ where: { id: 'class-e2e-001' } })
      const shadowClass = await prisma.class.upsert({
        where: { cohortId_name: { cohortId: sourceClass.cohortId, name: 'S2 同实训室范围保留班' } },
        update: { organizationId: sourceClass.organizationId, roomId: sourceClass.roomId },
        create: { organizationId: sourceClass.organizationId, roomId: sourceClass.roomId, cohortId: sourceClass.cohortId, name: 'S2 同实训室范围保留班' },
      })
      await prisma.classEnrollment.upsert({
        where: { classId_userId: { classId: shadowClass.id, userId: student.id } },
        update: { role: 'STUDENT', active: true },
        create: { classId: shadowClass.id, userId: student.id, role: 'STUDENT', active: true },
      })
      await prisma.classEnrollment.update({ where: { classId_userId: { classId: sourceClass.id, userId: student.id } }, data: { active: false } })

      await login(page, 'STUDENT')
      const centerList = await page.request.get('/api/center/assignments')
      expect(((await centerList.json()).assignments as Array<{ id: string }>).some(item => item.id === studentTaskId)).toBe(false)
      const compatibilityList = await page.request.get('/api/practicum/student/tasks')
      expect(((await compatibilityList.json()).items as Array<{ id: string }>).some(item => item.id === studentTaskId)).toBe(false)
      const progress = await page.request.get('/api/practicum/progress')
      expect(((await progress.json()).plans as Array<{ id: string }>).some(item => item.id === assignmentId)).toBe(false)

      const directRequests = [
        page.request.get(`/api/center/student-tasks/${studentTaskId}`),
        page.request.post(`/api/center/student-tasks/${studentTaskId}/start`, { headers: await csrfHeaders(page) }),
        page.request.post(`/api/center/student-tasks/${studentTaskId}/draft`, { headers: await csrfHeaders(page), data: {} }),
        page.request.post(`/api/center/student-tasks/${studentTaskId}/events`, { headers: await csrfHeaders(page), data: { eventType: 'HEARTBEAT' } }),
        page.request.post(`/api/center/student-tasks/${studentTaskId}/submissions`, { headers: await csrfHeaders(page, { 'Idempotency-Key': `s2-denied-${Date.now()}` }) }),
        page.request.get(`/api/practicum/student-tasks/${studentTaskId}`),
        page.request.post(`/api/practicum/student-tasks/${studentTaskId}/heartbeat`, { headers: await csrfHeaders(page), data: { eventType: 'HEARTBEAT' } }),
        page.request.get(`/api/practicum/student-tasks/${studentTaskId}/learning-state`),
        page.request.post(`/api/practicum/student-tasks/${studentTaskId}/learning-state`, { headers: await csrfHeaders(page), data: { type: 'TRAINING', answer: '越权请求' } }),
        page.request.post(`/api/practicum/student-tasks/${studentTaskId}/submissions`, { headers: await csrfHeaders(page, { 'Idempotency-Key': `s2-compat-denied-${Date.now()}` }), data: { text: '越权提交' } }),
      ]
      for (const response of await Promise.all(directRequests)) expect(response.status()).toBe(404)
    } finally {
      const student = await prisma.user.findUnique({ where: { identifier: 'student1' } })
      if (student) await prisma.classEnrollment.updateMany({ where: { classId: 'class-e2e-001', userId: student.id }, data: { active: true, role: 'STUDENT' } })
      await prisma.$disconnect()
    }
  })

  test('a class and training room organization mismatch invalidates student task scope', async ({ page }) => {
    const { assignmentId, studentTaskId } = await submittedTask(page)
    const prisma = new PrismaClient()
    const sourceClass = await prisma.class.findUniqueOrThrow({ where: { id: 'class-e2e-001' } })
    try {
      const otherOrganization = await prisma.organization.create({ data: { name: `S2 范围隔离组织 ${Date.now()}` } })
      await prisma.class.update({ where: { id: sourceClass.id }, data: { organizationId: otherOrganization.id } })
      await login(page, 'STUDENT')
      const centerList = await page.request.get('/api/center/assignments')
      expect(((await centerList.json()).assignments as Array<{ id: string }>).some(item => item.id === studentTaskId)).toBe(false)
      expect((await page.request.get(`/api/center/student-tasks/${studentTaskId}`)).status()).toBe(404)
      const compatibilityList = await page.request.get('/api/practicum/student/tasks')
      expect(((await compatibilityList.json()).items as Array<{ id: string }>).some(item => item.id === studentTaskId)).toBe(false)
      const progress = await page.request.get('/api/practicum/progress')
      expect(((await progress.json()).plans as Array<{ id: string }>).some(item => item.id === assignmentId)).toBe(false)
      expect((await page.request.get(`/api/practicum/student-tasks/${studentTaskId}`)).status()).toBe(404)
    } finally {
      await prisma.class.update({ where: { id: sourceClass.id }, data: { organizationId: sourceClass.organizationId } })
      await prisma.$disconnect()
    }
  })
})
