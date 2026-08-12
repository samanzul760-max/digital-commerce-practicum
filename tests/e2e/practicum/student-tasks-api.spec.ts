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

test('[C-STUDENT-011] student task context survives refresh with only its own return feedback and grade', async ({ browser }) => {
  const fixture = await createStudentTaskFixture()
  const context = await browser.newContext()
  const student = await context.newPage()
  try {
    expect((await student.request.post('/api/auth/login', {
      data: { identifier: 'student@example.test', password: 'StudentPass123!' },
    })).status()).toBe(200)

    const submission = await prisma.submission.create({
      data: { studentTaskId: fixture.task.id, currentVersion: 1, submittedAt: new Date('2026-08-07T10:00:00.000Z') },
    })
    await prisma.submissionVersion.create({
      data: { submissionId: submission.id, version: 1, text: 'Initial server submission' },
    })
    await prisma.taskEvent.createMany({
      data: [
        { studentTaskId: fixture.task.id, eventType: 'RETURNED', createdAt: new Date('2026-08-07T10:01:00.000Z'), payload: { feedback: 'Please revise the product analysis.' } },
        { studentTaskId: fixture.task.id, eventType: 'RETURNED', createdAt: new Date('2026-08-07T10:02:00.000Z'), payload: { feedback: 'Latest return feedback.' } },
      ],
    })
    await prisma.grade.create({
      data: { submissionId: submission.id, reviewerId: 'user-owner-001', score: 92, feedback: 'Grade feedback from the server.' },
    })
    const otherTask = await prisma.studentTask.create({
      data: {
        planAssignmentId: fixture.assignment.id,
        studentId: 'user-student-002',
        activityId: `other-${fixture.task.activityId}`,
        status: 'RETURNED',
        availableAt: fixture.task.availableAt,
        dueAt: fixture.task.dueAt,
      },
    })
    const otherSubmission = await prisma.submission.create({ data: { studentTaskId: otherTask.id, currentVersion: 1 } })
    await prisma.grade.create({ data: { submissionId: otherSubmission.id, reviewerId: 'user-owner-001', score: 100, feedback: 'Must not be visible.' } })
    await prisma.taskEvent.create({ data: { studentTaskId: otherTask.id, eventType: 'RETURNED', payload: { feedback: 'Must not be visible.' } } })

    const list = await student.request.get('/api/practicum/student/tasks')
    expect(list.status()).toBe(200)
    const listItems = (await list.json()).items
    expect(listItems.find((candidate: { id: string }) => candidate.id === fixture.task.id)).toEqual(expect.objectContaining({
      planId: fixture.assignment.planId,
      activity: expect.objectContaining({ id: fixture.task.activityId, title: expect.any(String) }),
    }))
    expect(listItems.some((candidate: { id: string }) => candidate.id === otherTask.id)).toBe(false)

    const detail = await student.request.get(`/api/practicum/student-tasks/${fixture.task.id}`)
    expect(detail.status()).toBe(200)
    const body = await detail.json()
    expect(body.task).toEqual(expect.objectContaining({
      planId: fixture.assignment.planId,
      activity: expect.objectContaining({ id: fixture.task.activityId, title: expect.any(String) }),
    }))
    expect(body.returnedFeedback).toEqual(expect.objectContaining({ feedback: 'Latest return feedback.' }))
    expect(body.submission.grade).toEqual(expect.objectContaining({ score: '92', feedback: 'Grade feedback from the server.' }))
  } finally {
    await context.close()
    await prisma.taskEvent.deleteMany({ where: { studentTaskId: { in: [fixture.task.id] } } })
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

test('[C-STUDENT-012] software learning state only accepts configured steps and restores a completed activity', async ({ browser }) => {
  const fixture = await createStudentTaskFixture()
  const task = await prisma.studentTask.update({
    where: { id: fixture.task.id },
    data: { planAssignment: { update: { planId: 'plan-wdds' } }, activityId: 'act-data-01-001' },
  })
  const context = await browser.newContext()
  const student = await context.newPage()
  try {
    expect((await student.request.post('/api/auth/login', {
      data: { identifier: 'student@example.test', password: 'StudentPass123!' },
    })).status()).toBe(200)

    const invalid = await student.request.post(`/api/practicum/student-tasks/${task.id}/learning-state`, {
      headers: await csrfHeaders(student),
      data: { type: 'SOFTWARE_ACTION', completedStepIds: ['step-1-1', 'not-a-configured-step'] },
    })
    expect(invalid.status()).toBe(422)
    expect((await invalid.json()).data.code).toBe('LEARNING_STATE_INVALID')

    const incomplete = await student.request.post(`/api/practicum/student-tasks/${task.id}/learning-state`, {
      headers: await csrfHeaders(student),
      data: { type: 'SOFTWARE_ACTION', completedStepIds: ['step-1-1'], complete: true },
    })
    expect(incomplete.status()).toBe(422)
    expect((await incomplete.json()).data.code).toBe('SOFTWARE_REQUIRED_STEPS_INCOMPLETE')

    const saved = await student.request.post(`/api/practicum/student-tasks/${task.id}/learning-state`, {
      headers: await csrfHeaders(student),
      data: { type: 'SOFTWARE_ACTION', completedStepIds: ['step-1-1', 'step-1-2'], complete: true },
    })
    expect(saved.status()).toBe(200)
    expect((await saved.json()).learningState).toEqual(expect.objectContaining({
      type: 'SOFTWARE_ACTION',
      completedStepIds: ['step-1-1', 'step-1-2'],
      completedAt: expect.any(String),
    }))

    const refreshed = await student.request.get(`/api/practicum/student-tasks/${task.id}/learning-state`)
    expect(refreshed.status()).toBe(200)
    expect((await refreshed.json()).learningState).toEqual(expect.objectContaining({
      type: 'SOFTWARE_ACTION',
      completedStepIds: ['step-1-1', 'step-1-2'],
      completedAt: expect.any(String),
    }))
  } finally {
    await context.close()
    await prisma.taskEvent.deleteMany({ where: { studentTaskId: fixture.task.id } })
    await prisma.planAssignment.delete({ where: { id: fixture.assignment.id } })
    await prisma.class.delete({ where: { id: fixture.classroom.id } })
    await prisma.cohort.delete({ where: { id: fixture.cohort.id } })
  }
})

test('[C-STUDENT-013] training attempts persist deterministic feedback and enforce the configured limit', async ({ browser }) => {
  const fixture = await createStudentTaskFixture()
  const task = await prisma.studentTask.update({
    where: { id: fixture.task.id },
    data: { planAssignment: { update: { planId: 'plan-wdds' } }, activityId: 'act-data-01-002' },
  })
  const context = await browser.newContext()
  const student = await context.newPage()
  try {
    expect((await student.request.post('/api/auth/login', {
      data: { identifier: 'student@example.test', password: 'StudentPass123!' },
    })).status()).toBe(200)

    const first = await student.request.post(`/api/practicum/student-tasks/${task.id}/learning-state`, {
      headers: await csrfHeaders(student),
      data: { type: 'TRAINING', answer: '完整的训练回答，包含必要信息。' },
    })
    expect(first.status()).toBe(200)
    expect((await first.json()).learningState).toEqual(expect.objectContaining({
      type: 'TRAINING',
      attempts: [expect.objectContaining({ answer: '完整的训练回答，包含必要信息。', feedback: expect.any(String), submittedAt: expect.any(String) })],
    }))

    for (const answer of ['第二次训练回答。', '第三次训练回答。']) {
      const response = await student.request.post(`/api/practicum/student-tasks/${task.id}/learning-state`, {
        headers: await csrfHeaders(student),
        data: { type: 'TRAINING', answer },
      })
      expect(response.status()).toBe(200)
    }
    const exhausted = await student.request.post(`/api/practicum/student-tasks/${task.id}/learning-state`, {
      headers: await csrfHeaders(student),
      data: { type: 'TRAINING', answer: '第四次不能被保存。' },
    })
    expect(exhausted.status()).toBe(409)
    expect((await exhausted.json()).data.code).toBe('TRAINING_ATTEMPTS_EXHAUSTED')

    const refreshed = await student.request.get(`/api/practicum/student-tasks/${task.id}/learning-state`)
    expect(refreshed.status()).toBe(200)
    const learningState = (await refreshed.json()).learningState
    expect(learningState).toEqual(expect.objectContaining({ type: 'TRAINING', maxAttempts: 3 }))
    expect(learningState.attempts).toHaveLength(3)
    expect(learningState.attempts.map((attempt: { answer: string }) => attempt.answer)).toEqual([
      '完整的训练回答，包含必要信息。',
      '第二次训练回答。',
      '第三次训练回答。',
    ])
  } finally {
    await context.close()
    await prisma.taskEvent.deleteMany({ where: { studentTaskId: fixture.task.id } })
    await prisma.planAssignment.delete({ where: { id: fixture.assignment.id } })
    await prisma.class.delete({ where: { id: fixture.classroom.id } })
    await prisma.cohort.delete({ where: { id: fixture.cohort.id } })
  }
})
