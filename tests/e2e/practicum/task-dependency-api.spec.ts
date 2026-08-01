import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { csrfHeaders } from './csrf'

const prisma = new PrismaClient()
const studentPassword = process.env.E2E_STUDENT_PASSWORD
const teacherPassword = process.env.E2E_TEACHER_PASSWORD

test.beforeEach(() => {
  test.skip(!studentPassword || !teacherPassword, 'E2E_STUDENT_PASSWORD and E2E_TEACHER_PASSWORD are required for authenticated API scenarios')
})

/**
 * Given a student has task B with an incomplete prerequisite task A
 * When the student submits task B
 * Then the API rejects the submission and task B remains locked
 */
test('[SB-PLAN-002] student cannot submit a task with an incomplete prerequisite', async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const organization = await prisma.organization.create({ data: { name: `Dependency organization ${suffix}` } })
  const room = await prisma.trainingRoom.create({ data: { organizationId: organization.id, name: `Dependency room ${suffix}` } })
  const cohort = await prisma.cohort.create({
    data: {
      organizationId: organization.id,
      name: `Dependency cohort ${suffix}`,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
    },
  })
  const classroom = await prisma.class.create({ data: { organizationId: organization.id, roomId: room.id, cohortId: cohort.id, name: `Dependency class ${suffix}` } })
  const assignment = await prisma.planAssignment.create({
    data: {
      classId: classroom.id,
      planId: `dependency-plan-${suffix}`,
      title: 'Dependency assignment',
      status: 'PUBLISHED',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
  const prerequisite = await prisma.studentTask.create({
    data: {
      planAssignmentId: assignment.id,
      studentId: 'user-student-001',
      activityId: `prerequisite-${suffix}`,
      status: 'AVAILABLE',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
  const lockedTask = await prisma.studentTask.create({
    data: {
      planAssignmentId: assignment.id,
      studentId: 'user-student-001',
      activityId: `dependent-${suffix}`,
      status: 'LOCKED',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
  await prisma.taskDependency.create({
    data: {
      planAssignmentId: assignment.id,
      activityId: lockedTask.activityId,
      prerequisiteActivityId: prerequisite.activityId,
    },
  })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    const login = await page.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: studentPassword } })
    expect(login.status()).toBe(200)

    const response = await page.request.post(`/api/practicum/student-tasks/${lockedTask.id}/submissions`, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': `dependency-${suffix}` }),
      data: { text: 'Attempting a locked task.' },
    })

    expect(response.status()).toBe(409)
    expect((await response.json()).data.code).toBe('TASK_LOCKED')
    await expect.poll(async () => (await prisma.studentTask.findUniqueOrThrow({ where: { id: lockedTask.id } })).status).toBe('LOCKED')
    expect(await prisma.submission.count({ where: { studentTaskId: lockedTask.id } })).toBe(0)
    await context.close()
  } finally {
    await prisma.planAssignment.delete({ where: { id: assignment.id } })
    await prisma.class.delete({ where: { id: classroom.id } })
    await prisma.cohort.delete({ where: { id: cohort.id } })
    await prisma.trainingRoom.delete({ where: { id: room.id } })
    await prisma.organization.delete({ where: { id: organization.id } })
  }
})

/**
 * Given a student has task B with a completed prerequisite task A
 * When the student reads task B
 * Then the API marks task B as available
 */
test('[SB-PLAN-002] completed prerequisites unlock the dependent task', async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const organization = await prisma.organization.create({ data: { name: `Unlock organization ${suffix}` } })
  const room = await prisma.trainingRoom.create({ data: { organizationId: organization.id, name: `Unlock room ${suffix}` } })
  const cohort = await prisma.cohort.create({
    data: {
      organizationId: organization.id,
      name: `Unlock cohort ${suffix}`,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
    },
  })
  const classroom = await prisma.class.create({ data: { organizationId: organization.id, roomId: room.id, cohortId: cohort.id, name: `Unlock class ${suffix}` } })
  const assignment = await prisma.planAssignment.create({
    data: {
      classId: classroom.id,
      planId: `unlock-plan-${suffix}`,
      title: 'Unlock assignment',
      status: 'PUBLISHED',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
  const prerequisite = await prisma.studentTask.create({
    data: {
      planAssignmentId: assignment.id,
      studentId: 'user-student-001',
      activityId: `completed-prerequisite-${suffix}`,
      status: 'GRADED',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
  const lockedTask = await prisma.studentTask.create({
    data: {
      planAssignmentId: assignment.id,
      studentId: 'user-student-001',
      activityId: `unlocked-dependent-${suffix}`,
      status: 'LOCKED',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
  await prisma.taskDependency.create({
    data: {
      planAssignmentId: assignment.id,
      activityId: lockedTask.activityId,
      prerequisiteActivityId: prerequisite.activityId,
    },
  })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    const login = await page.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: studentPassword } })
    expect(login.status()).toBe(200)

    const response = await page.request.get('/api/practicum/student/tasks')
    expect(response.status()).toBe(200)
    const item = (await response.json()).items.find((candidate: { id: string }) => candidate.id === lockedTask.id)
    expect(item.status).toBe('AVAILABLE')
    expect((await prisma.studentTask.findUniqueOrThrow({ where: { id: lockedTask.id } })).status).toBe('AVAILABLE')
    await context.close()
  } finally {
    await prisma.planAssignment.delete({ where: { id: assignment.id } })
    await prisma.class.delete({ where: { id: classroom.id } })
    await prisma.cohort.delete({ where: { id: cohort.id } })
    await prisma.trainingRoom.delete({ where: { id: room.id } })
    await prisma.organization.delete({ where: { id: organization.id } })
  }
})

/**
 * Given a student has task B with a submitted prerequisite task A
 * When a teacher grades task A
 * Then the API marks task B as available
 */
test('[SB-PLAN-002] grading a prerequisite unlocks the dependent task', async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const organization = await prisma.organization.create({ data: { name: `Grade unlock organization ${suffix}` } })
  const room = await prisma.trainingRoom.create({ data: { organizationId: organization.id, name: `Grade unlock room ${suffix}` } })
  const cohort = await prisma.cohort.create({
    data: {
      organizationId: organization.id,
      name: `Grade unlock cohort ${suffix}`,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
    },
  })
  const classroom = await prisma.class.create({ data: { organizationId: organization.id, roomId: room.id, cohortId: cohort.id, name: `Grade unlock class ${suffix}` } })
  await prisma.classEnrollment.create({ data: { classId: classroom.id, userId: 'user-teacher-001', role: 'TEACHER' } })
  const assignment = await prisma.planAssignment.create({
    data: {
      classId: classroom.id,
      planId: `grade-unlock-plan-${suffix}`,
      title: 'Grade unlock assignment',
      status: 'PUBLISHED',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
  const prerequisite = await prisma.studentTask.create({
    data: {
      planAssignmentId: assignment.id,
      studentId: 'user-student-001',
      activityId: `submitted-prerequisite-${suffix}`,
      status: 'SUBMITTED',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
  await prisma.submission.create({ data: { studentTaskId: prerequisite.id, currentVersion: 1, submittedAt: new Date('2026-01-02T00:00:00.000Z') } })
  const lockedTask = await prisma.studentTask.create({
    data: {
      planAssignmentId: assignment.id,
      studentId: 'user-student-001',
      activityId: `grade-unlocked-dependent-${suffix}`,
      status: 'LOCKED',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
  await prisma.taskDependency.create({
    data: {
      planAssignmentId: assignment.id,
      activityId: lockedTask.activityId,
      prerequisiteActivityId: prerequisite.activityId,
    },
  })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    const login = await page.request.post('/api/auth/login', { data: { identifier: 'teacher@example.test', password: teacherPassword } })
    expect(login.status()).toBe(200)

    const response = await page.request.post(`/api/practicum/teacher/student-tasks/${prerequisite.id}/grade`, {
      headers: await csrfHeaders(page),
      data: { score: 90, feedback: 'Prerequisite completed.' },
    })
    expect(response.status()).toBe(200)
    expect((await prisma.studentTask.findUniqueOrThrow({ where: { id: lockedTask.id } })).status).toBe('AVAILABLE')
    await context.close()
  } finally {
    await prisma.planAssignment.delete({ where: { id: assignment.id } })
    await prisma.class.delete({ where: { id: classroom.id } })
    await prisma.cohort.delete({ where: { id: cohort.id } })
    await prisma.trainingRoom.delete({ where: { id: room.id } })
    await prisma.organization.delete({ where: { id: organization.id } })
  }
})

/**
 * Given a student has an available task
 * When the student retries submission with the same Idempotency-Key
 * Then the API returns the original submission without a new version
 */
test('[SB-SUB-002] retrying a submission key returns the original version', async ({ browser }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const organization = await prisma.organization.create({ data: { name: `Idempotency organization ${suffix}` } })
  const room = await prisma.trainingRoom.create({ data: { organizationId: organization.id, name: `Idempotency room ${suffix}` } })
  const cohort = await prisma.cohort.create({
    data: {
      organizationId: organization.id,
      name: `Idempotency cohort ${suffix}`,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
    },
  })
  const classroom = await prisma.class.create({ data: { organizationId: organization.id, roomId: room.id, cohortId: cohort.id, name: `Idempotency class ${suffix}` } })
  const assignment = await prisma.planAssignment.create({
    data: {
      classId: classroom.id,
      planId: `idempotency-plan-${suffix}`,
      title: 'Idempotency assignment',
      status: 'PUBLISHED',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })
  const task = await prisma.studentTask.create({
    data: {
      planAssignmentId: assignment.id,
      studentId: 'user-student-001',
      activityId: `idempotency-activity-${suffix}`,
      status: 'AVAILABLE',
      availableAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    const login = await page.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: studentPassword } })
    expect(login.status()).toBe(200)
    const key = `submission-idempotency-${suffix}`
    const first = await page.request.post(`/api/practicum/student-tasks/${task.id}/submissions`, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
      data: { text: 'Original submission.' },
    })
    const second = await page.request.post(`/api/practicum/student-tasks/${task.id}/submissions`, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
      data: { text: 'Original submission.' },
    })

    expect(first.status()).toBe(200)
    expect(second.status()).toBe(200)
    const firstSubmission = (await first.json()).submission
    const secondSubmission = (await second.json()).submission
    expect(secondSubmission.id).toBe(firstSubmission.id)
    expect(secondSubmission.currentVersion).toBe(1)
    expect(await prisma.submissionVersion.count({ where: { submissionId: firstSubmission.id } })).toBe(1)
    await context.close()
  } finally {
    await prisma.planAssignment.delete({ where: { id: assignment.id } })
    await prisma.class.delete({ where: { id: classroom.id } })
    await prisma.cohort.delete({ where: { id: cohort.id } })
    await prisma.trainingRoom.delete({ where: { id: room.id } })
    await prisma.organization.delete({ where: { id: organization.id } })
  }
})
