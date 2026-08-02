import { expect, test } from '@playwright/test'
import { prisma } from '../../../server/db/client'
import { csrfHeaders } from './csrf'

async function ensureTeacherRoomFixture() {
  await prisma.organization.upsert({
    where: { id: 'org-demo' },
    update: {},
    create: { id: 'org-demo', name: 'Demo College' },
  })
  await prisma.trainingRoom.upsert({
    where: { id: 'room-001' },
    update: { organizationId: 'org-demo' },
    create: { id: 'room-001', organizationId: 'org-demo', name: 'Commerce Practicum Room' },
  })

  const suffix = `${Date.now()}-${Math.round(Math.random() * 100_000)}`
  return await prisma.cohort.create({
    data: {
      organizationId: 'org-demo',
      name: `Teacher class fixture ${suffix}`,
      startsAt: new Date('2026-08-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T00:00:00.000Z'),
    },
  })
}

test.describe('teacher class scope API contract', () => {
  test('[SB-T-04] authorized teacher creates a class and sees it after refresh', async ({ browser }) => {
    const cohort = await ensureTeacherRoomFixture()
    const context = await browser.newContext()
    const page = await context.newPage()
    const login = await page.request.post('/api/auth/login', {
      data: { identifier: 'teacher@example.test', password: 'TeacherPass123!' },
    })
    expect(login.status()).toBe(200)

    const name = `Operations class ${Date.now()}`
    const created = await page.request.post('/api/practicum/classes', {
      headers: await csrfHeaders(page),
      data: { organizationId: 'org-demo', roomId: 'room-001', cohortId: cohort.id, name },
    })

    expect(created.status()).toBe(201)
    const classroom = (await created.json()).class
    expect(classroom).toEqual(expect.objectContaining({ name, roomId: 'room-001' }))

    const listed = await page.request.get('/api/practicum/classes?organizationId=org-demo&roomId=room-001')
    expect(listed.status()).toBe(200)
    expect((await listed.json()).items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: classroom.id, name }),
    ]))

    const enrolled = await page.request.post(`/api/practicum/classes/${classroom.id}/enrollments`, {
      headers: await csrfHeaders(page),
      data: { userId: 'user-student-001', role: 'STUDENT' },
    })
    expect(enrolled.status()).toBe(201)

    const members = await page.request.get(`/api/practicum/classes/${classroom.id}/enrollments`)
    expect(members.status()).toBe(200)
    expect((await members.json()).items).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 'user-student-001', role: 'STUDENT', active: true }),
    ]))

    const publishKey = `class-assignment-${Date.now()}`
    const assignmentInput = {
      classId: classroom.id,
      planId: `plan-${publishKey}`,
      title: `Assignment ${publishKey}`,
      activityIds: [`activity-a-${publishKey}`, `activity-b-${publishKey}`],
      availableAt: '2026-08-01T00:00:00.000Z',
    }
    const published = await page.request.post('/api/practicum/plan-assignments', {
      headers: await csrfHeaders(page, { 'Idempotency-Key': publishKey }),
      data: assignmentInput,
    })
    expect(published.status()).toBe(201)
    const assignment = (await published.json()).assignment
    expect((await published.json()).taskCount).toBe(2)

    const replayed = await page.request.post('/api/practicum/plan-assignments', {
      headers: await csrfHeaders(page, { 'Idempotency-Key': publishKey }),
      data: assignmentInput,
    })
    expect(replayed.status()).toBe(200)
    expect((await replayed.json()).assignment.id).toBe(assignment.id)

    const roster = await page.request.get('/api/practicum/roster/students?organizationId=org-demo&roomId=room-001')
    expect(roster.status()).toBe(200)
    expect((await roster.json()).items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'user-student-001', displayLabel: expect.any(String) }),
    ]))

    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    expect((await student.request.post('/api/auth/login', {
      data: { identifier: 'student@example.test', password: 'StudentPass123!' },
    })).status()).toBe(200)
    const tasks = await student.request.get('/api/practicum/student/tasks')
    expect(tasks.status()).toBe(200)
    const assignedTasks = (await tasks.json()).items.filter((item: { planAssignmentId: string }) => item.planAssignmentId === assignment.id)
    expect(assignedTasks).toHaveLength(2)
    const task = assignedTasks[0]
    const firstSubmission = await student.request.post(`/api/practicum/student-tasks/${task.id}/submissions`, {
      headers: await csrfHeaders(student, { 'Idempotency-Key': `first-${publishKey}` }),
      data: { text: 'First version' },
    })
    expect(firstSubmission.status()).toBe(200)

    const returned = await page.request.post(`/api/practicum/teacher/student-tasks/${task.id}/return`, {
      headers: await csrfHeaders(page),
      data: { feedback: 'Please add the source data.' },
    })
    expect(returned.status()).toBe(200)
    expect((await returned.json()).task.status).toBe('RETURNED')

    const resubmitted = await student.request.post(`/api/practicum/student-tasks/${task.id}/submissions`, {
      headers: await csrfHeaders(student, { 'Idempotency-Key': `second-${publishKey}` }),
      data: { text: 'Second version with source data' },
    })
    expect(resubmitted.status()).toBe(200)
    expect((await resubmitted.json()).submission.currentVersion).toBe(2)
    const graded = await page.request.post(`/api/practicum/teacher/student-tasks/${task.id}/grade`, {
      headers: await csrfHeaders(page),
      data: { score: 86, feedback: 'Approved after revision.' },
    })
    expect(graded.status()).toBe(200)
    const detail = await student.request.get(`/api/practicum/student-tasks/${task.id}`)
    expect(detail.status()).toBe(200)
    expect((await detail.json()).task.status).toBe('GRADED')
    expect((await detail.json()).submission.grade.score).toBe('86')
    expect((await student.request.get(`/api/practicum/classes/${classroom.id}/enrollments`)).status()).toBe(404)
    await studentContext.close()

    await context.close()
  })
})
