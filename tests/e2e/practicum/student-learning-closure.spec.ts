import { expect, test } from '@playwright/test'
import { prisma } from '../../../server/db/client'
import { csrfHeaders } from './csrf'
import { loginAsStudent, loginAsTeacher } from './auth-helpers'

test('[C-STUDENT-001] student task rows come from the assigned server task after refresh', async ({ browser }) => {
  const nonce = Date.now()
  const cohort = await prisma.cohort.create({
    data: {
      organizationId: 'org-demo',
      name: `Student closure cohort ${nonce}`,
      startsAt: new Date('2026-08-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T00:00:00.000Z'),
    },
  })

  const teacherContext = await browser.newContext()
  const teacher = await teacherContext.newPage()
  await loginAsTeacher(teacher)
  const classroomResponse = await teacher.request.post('/api/practicum/classes', {
    headers: await csrfHeaders(teacher),
    data: { organizationId: 'org-demo', roomId: 'room-001', cohortId: cohort.id, name: `Student closure class ${nonce}` },
  })
  expect(classroomResponse.status()).toBe(201)
  const classroom = (await classroomResponse.json()).class as { id: string }
  const enrollment = await teacher.request.post(`/api/practicum/classes/${classroom.id}/enrollments`, {
    headers: await csrfHeaders(teacher),
    data: { userId: 'user-student-001', role: 'STUDENT' },
  })
  expect(enrollment.status()).toBe(201)
  const published = await teacher.request.post(`/api/practicum/classes/${classroom.id}/assignments`, {
    headers: await csrfHeaders(teacher, { 'Idempotency-Key': `student-closure-${nonce}` }),
    data: {
      planId: 'plan-wdds',
      title: `服务端学生任务 ${nonce}`,
      activityIds: [`activity-closure-${nonce}`],
      availableAt: '2026-08-06T00:00:00.000Z',
      dueAt: '2026-12-31T00:00:00.000Z',
      lateAllowed: false,
    },
  })
  expect(published.status()).toBe(201)

  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  await student.goto('/practicum/profile')
  await student.locator('[data-role-option="STUDENT"]').click()
  await student.goto('/practicum/tasks')

  const row = student.locator('[data-student-task-row]').filter({ hasText: `服务端学生任务 ${nonce}` })
  await expect(row).toHaveCount(1)
  await expect(row).toHaveAttribute('data-task-id', expect.any(String))
  await expect(row.locator('[data-task-status]')).toHaveText('待提交')
  await student.reload()
  await expect(row).toHaveCount(1)

  await studentContext.close()
  await teacherContext.close()
})
