import { expect, test } from '@playwright/test'
import { prisma } from '../../../server/db/client'
import { csrfHeaders } from './csrf'

async function createTeacherClass(page: import('@playwright/test').Page) {
  const cohort = await prisma.cohort.create({
    data: {
      organizationId: 'org-demo',
      name: `Assignment cohort ${Date.now()}`,
      startsAt: new Date('2026-08-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T00:00:00.000Z'),
    },
  })
  const created = await page.request.post('/api/practicum/classes', {
    headers: await csrfHeaders(page),
    data: {
      organizationId: 'org-demo',
      roomId: 'room-001',
      cohortId: cohort.id,
      name: `Assignment class ${Date.now()}`,
    },
  })
  expect(created.status()).toBe(201)
  return (await created.json()).class as { id: string }
}

test('[SB-T-05] teacher publishes and refreshes assignments only for their class', async ({ browser }) => {
  const teacherContext = await browser.newContext()
  const teacher = await teacherContext.newPage()
  expect((await teacher.request.post('/api/auth/login', {
    data: { identifier: 'teacher@example.test', password: 'TeacherPass123!' },
  })).status()).toBe(200)

  const classroom = await createTeacherClass(teacher)
  const enrolled = await teacher.request.post(`/api/practicum/classes/${classroom.id}/enrollments`, {
    headers: await csrfHeaders(teacher),
    data: { userId: 'user-student-001', role: 'STUDENT' },
  })
  expect(enrolled.status()).toBe(201)

  const key = `class-route-${Date.now()}`
  const published = await teacher.request.post(`/api/practicum/classes/${classroom.id}/assignments`, {
    headers: await csrfHeaders(teacher, { 'Idempotency-Key': key }),
    data: {
      planId: `plan-${key}`,
      title: '商品分析任务',
      activityIds: [`activity-a-${key}`, `activity-b-${key}`],
      availableAt: '2026-08-01T00:00:00.000Z',
      dueAt: '2026-08-15T00:00:00.000Z',
      lateAllowed: false,
    },
  })

  expect(published.status()).toBe(201)
  expect((await published.json())).toEqual(expect.objectContaining({ taskCount: 2 }))

  const assignments = await teacher.request.get(`/api/practicum/classes/${classroom.id}/assignments`)
  expect(assignments.status()).toBe(200)
  expect((await assignments.json()).items).toEqual(expect.arrayContaining([
    expect.objectContaining({ title: '商品分析任务', taskCount: 2, submittedCount: 0, gradedCount: 0 }),
  ]))
  await teacherContext.close()
})
