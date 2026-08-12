import { expect, test, type Browser, type Page } from '@playwright/test'
import { prisma } from '../../../server/db/client'
import { csrfHeaders } from './csrf'
import { loginAsOwner, loginAsStudent } from './auth-helpers'

async function createFixture(owner: Page, browser: Browser) {
  const suffix = `activity-detail-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const cohort = await prisma.cohort.create({
    data: {
      organizationId: 'org-demo',
      name: `活动详情闭环 ${suffix}`,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T23:59:59.000Z'),
    },
  })
  const classroom = await prisma.class.create({
    data: { organizationId: 'org-demo', roomId: 'room-001', cohortId: cohort.id, name: `活动详情班级 ${suffix}` },
  })
  await owner.request.post(`/api/practicum/classes/${classroom.id}/enrollments`, {
    headers: await csrfHeaders(owner),
    data: { userId: 'user-student-001', role: 'STUDENT' },
  })
  const assignment = await owner.request.post(`/api/practicum/classes/${classroom.id}/assignments`, {
    headers: await csrfHeaders(owner, { 'Idempotency-Key': `${suffix}-assignment` }),
    data: {
      planId: 'plan-wdds',
      title: `活动详情提交任务 ${suffix}`,
      activityIds: ['act-01-003'],
      availableAt: '2026-01-01T00:00:00.000Z',
      dueAt: '2026-12-31T23:59:59.000Z',
      lateAllowed: false,
    },
  })
  expect(assignment.status()).toBe(201)
  const assignmentBody = await assignment.json()
  const task = await prisma.studentTask.findFirstOrThrow({ where: { planAssignmentId: assignmentBody.assignment.id, studentId: 'user-student-001' } })
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  return { suffix, cohortId: cohort.id, classId: classroom.id, taskId: task.id, studentContext, student }
}

test.describe('学生活动详情服务端闭环', () => {
  test('学生提交、刷新恢复、退回再提交、评分可见且移动端无溢出', async ({ browser }) => {
    const ownerContext = await browser.newContext()
    const owner = await ownerContext.newPage()
    await loginAsOwner(owner)
    const fixture = await createFixture(owner, browser)
    try {
      await fixture.student.goto(`/practicum/activities/act-01-003?taskId=${fixture.taskId}`)
      await expect(fixture.student.locator('[data-loading]')).toHaveCount(0)
      await expect(fixture.student.locator('[data-activity-page]')).toBeVisible()

      await fixture.student.locator('[data-practice-draft]').fill('第一版服务端实践成果')
      await fixture.student.locator('[data-submit-practice]').click()
      await fixture.student.locator('[data-confirm-submit]').click()
      await expect(fixture.student.locator('[data-submission-status]')).toHaveText('已提交')
      await expect(fixture.student.locator('[data-submission-version]')).toHaveCount(1)

      await fixture.student.reload()
      await expect(fixture.student.locator('[data-loading]')).toHaveCount(0)
      await expect(fixture.student.locator('[data-submission-version]')).toContainText('第一版服务端实践成果')
      await expect(fixture.student.locator('[data-submission-status]')).toHaveText('已提交')

      const returned = await owner.request.post(`/api/practicum/teacher/student-tasks/${fixture.taskId}/return`, {
        headers: await csrfHeaders(owner),
        data: { feedback: '请补充数据截图和结论依据。' },
      })
      expect(returned.status()).toBe(200)
      await fixture.student.reload()
      await expect(fixture.student.locator('[data-submission-status]')).toHaveText('已退回')
      // Known API gap: the task detail response exposes status and versions but
      // does not expose TaskEvent.payload.feedback, so feedback cannot survive refresh yet.
      test.info().annotations.push({ type: 'known-gap', description: 'student task detail does not return teacher return feedback' })

      await fixture.student.locator('[data-practice-draft]').fill('第二版补充数据截图与结论依据')
      await fixture.student.locator('[data-submit-practice]').click()
      await fixture.student.locator('[data-confirm-submit]').click()
      await expect(fixture.student.locator('[data-submission-version]')).toHaveCount(2)
      await expect(fixture.student.locator('[data-submission-version]').filter({ hasText: '第二版补充数据截图与结论依据' })).toHaveCount(1)

      const graded = await owner.request.post(`/api/practicum/teacher/student-tasks/${fixture.taskId}/grade`, {
        headers: await csrfHeaders(owner),
        data: { score: 92, feedback: '证据完整，结论清晰。' },
      })
      expect(graded.status()).toBe(200)
      await fixture.student.reload()
      await expect(fixture.student.locator('[data-submission-status]')).toHaveText('已评分')
      await expect(fixture.student.locator('[data-submission-grade]')).toContainText('92')
      await expect(fixture.student.locator('[data-submission-grade-feedback]')).toContainText('证据完整，结论清晰。')

      await fixture.student.setViewportSize({ width: 390, height: 844 })
      await expect(fixture.student.locator('body')).toHaveJSProperty('scrollWidth', 390)
    } finally {
      await fixture.studentContext.close()
      await ownerContext.close()
      await prisma.planAssignment.deleteMany({ where: { classId: fixture.classId } })
      await prisma.class.delete({ where: { id: fixture.classId } })
      await prisma.cohort.delete({ where: { id: fixture.cohortId } })
    }
  })
})
