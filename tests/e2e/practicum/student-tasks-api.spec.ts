import { expect, test } from '@playwright/test'
import { prisma } from '../../../server/db/client'
import { csrfHeaders } from './csrf'

async function createStudentTaskFixture() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const organization = await prisma.organization.upsert({
    where: { id: 'org-demo' },
    update: {},
    create: { id: 'org-demo', name: 'Demo College' },
  })
  const room = await prisma.trainingRoom.upsert({
    where: { id: 'room-001' },
    update: { organizationId: organization.id },
    create: { id: 'room-001', organizationId: organization.id, name: 'Commerce Practicum Room' },
  })
  const cohort = await prisma.cohort.create({
    data: {
      organizationId: organization.id,
      name: `Student task API cohort ${suffix}`,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
    },
  })
  const classroom = await prisma.class.create({
    data: { organizationId: organization.id, roomId: room.id, cohortId: cohort.id, name: `Student task API class ${suffix}` },
  })
  const assignment = await prisma.planAssignment.create({
    data: {
      classId: classroom.id,
      planId: `student-task-api-plan-${suffix}`,
      title: `服务端任务来源 ${suffix}`,
      status: 'PUBLISHED',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
      dueAt: new Date('2026-12-31T23:59:59.000Z'),
      lateAllowed: false,
    },
  })
  const task = await prisma.studentTask.create({
    data: {
      planAssignmentId: assignment.id,
      studentId: 'user-student-001',
      activityId: `activity-${suffix}`,
      status: 'AVAILABLE',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
      dueAt: new Date('2026-12-31T23:59:59.000Z'),
    },
  })
  return { organization, room, cohort, classroom, assignment, task }
}

test('[C-STUDENT-007] student task DTO exposes source, activity and availability fields', async ({ browser }) => {
  const fixture = await createStudentTaskFixture()
  const context = await browser.newContext()
  const student = await context.newPage()
  try {
    expect((await student.request.post('/api/auth/login', {
      data: { identifier: 'student@example.test', password: 'StudentPass123!' },
    })).status()).toBe(200)

    const response = await student.request.get('/api/practicum/student/tasks')
    expect(response.status()).toBe(200)
    const item = (await response.json()).items.find((candidate: { id: string }) => candidate.id === fixture.task.id)
    expect(item).toEqual(expect.objectContaining({
      id: fixture.task.id,
      activityId: fixture.task.activityId,
      status: 'AVAILABLE',
      availability: 'AVAILABLE',
      availableAt: expect.any(String),
      dueAt: expect.any(String),
      source: expect.objectContaining({ title: fixture.assignment.title }),
    }))

    const detail = await student.request.get(`/api/practicum/student-tasks/${fixture.task.id}`)
    expect(detail.status()).toBe(200)
    expect((await detail.json()).task).toEqual(expect.objectContaining({
      id: fixture.task.id,
      status: 'AVAILABLE',
      availability: 'AVAILABLE',
      activityId: fixture.task.activityId,
      source: expect.objectContaining({ title: fixture.assignment.title }),
    }))
  } finally {
    await context.close()
    await prisma.planAssignment.delete({ where: { id: fixture.assignment.id } })
    await prisma.class.delete({ where: { id: fixture.classroom.id } })
    await prisma.cohort.delete({ where: { id: fixture.cohort.id } })
  }
})

test('[C-STUDENT-009] empty submission is rejected and the same idempotency key is replayable', async ({ browser }) => {
  const fixture = await createStudentTaskFixture()
  const context = await browser.newContext()
  const student = await context.newPage()
  try {
    expect((await student.request.post('/api/auth/login', {
      data: { identifier: 'student@example.test', password: 'StudentPass123!' },
    })).status()).toBe(200)
    const empty = await student.request.post(`/api/practicum/student-tasks/${fixture.task.id}/submissions`, {
      headers: await csrfHeaders(student, { 'Idempotency-Key': `empty-${fixture.task.id}` }),
      data: { text: '   ' },
    })
    expect(empty.status()).toBe(422)
    expect((await empty.json()).data.code).toBe('SUBMISSION_INVALID')
    expect(await prisma.submission.count({ where: { studentTaskId: fixture.task.id } })).toBe(0)

    const key = `replay-${fixture.task.id}`
    const first = await student.request.post(`/api/practicum/student-tasks/${fixture.task.id}/submissions`, {
      headers: await csrfHeaders(student, { 'Idempotency-Key': key }),
      data: { text: 'First server version' },
    })
    const second = await student.request.post(`/api/practicum/student-tasks/${fixture.task.id}/submissions`, {
      headers: await csrfHeaders(student, { 'Idempotency-Key': key }),
      data: { text: 'Should not create another version' },
    })
    expect(first.status()).toBe(200)
    expect(second.status()).toBe(200)
    expect((await second.json()).submission.currentVersion).toBe(1)
    expect(await prisma.submissionVersion.count({ where: { submission: { studentTaskId: fixture.task.id } } })).toBe(1)
  } finally {
    await context.close()
    await prisma.planAssignment.delete({ where: { id: fixture.assignment.id } })
    await prisma.class.delete({ where: { id: fixture.classroom.id } })
    await prisma.cohort.delete({ where: { id: fixture.cohort.id } })
  }
})

test('[C-STUDENT-010] another student cannot read or submit the task', async ({ browser }) => {
  const fixture = await createStudentTaskFixture()
  const context = await browser.newContext()
  const student = await context.newPage()
  try {
    expect((await student.request.post('/api/auth/login', {
      data: { identifier: 'student@example.test', password: 'StudentPass123!' },
    })).status()).toBe(200)
    await prisma.studentTask.update({ where: { id: fixture.task.id }, data: { studentId: 'user-student-002' } })
    const detail = await student.request.get(`/api/practicum/student-tasks/${fixture.task.id}`)
    expect(detail.status()).toBe(404)
    expect((await detail.json()).data.code).toBe('TASK_NOT_FOUND')
    const submit = await student.request.post(`/api/practicum/student-tasks/${fixture.task.id}/submissions`, {
      headers: await csrfHeaders(student, { 'Idempotency-Key': `forbidden-${fixture.task.id}` }),
      data: { text: 'Must not be stored' },
    })
    expect(submit.status()).toBe(404)
    expect(await prisma.submission.count({ where: { studentTaskId: fixture.task.id } })).toBe(0)
  } finally {
    await context.close()
    await prisma.planAssignment.delete({ where: { id: fixture.assignment.id } })
    await prisma.class.delete({ where: { id: fixture.classroom.id } })
    await prisma.cohort.delete({ where: { id: fixture.cohort.id } })
  }
})
