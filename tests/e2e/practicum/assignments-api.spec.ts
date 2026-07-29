import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'

test.describe('classroom assignment API contract', () => {
  test('[SB-T-04][SB-T-06][SB-W-07] teacher can create and publish an idempotent classroom assignment', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const login = await page.request.post('/api/auth/login', { data: { identifier: 'teacher@example.test', password: 'TeacherPass123!' } })
    expect(login.status()).toBe(200)

    const key = `assignment-${Date.now()}`
    const input = { planId: 'plan-wdds', title: `课堂作业 ${key}`, instructions: '完成店铺运营数据分析并提交结论。', audience: 'ALL_STUDENTS' }
    const created = await page.request.post('/api/practicum/assignments', { headers: await csrfHeaders(page, { 'Idempotency-Key': key }), data: input })
    expect(created.status()).toBe(201)
    const assignment = (await created.json()).assignment
    expect(assignment.status).toBe('DRAFT')

    const published = await page.request.post(`/api/practicum/assignments/${assignment.id}/publish`, { headers: await csrfHeaders(page) })
    expect(published.status()).toBe(200)
    expect((await published.json()).assignment.status).toBe('PUBLISHED')

    const replayed = await page.request.post('/api/practicum/assignments', { headers: await csrfHeaders(page, { 'Idempotency-Key': key }), data: input })
    expect(replayed.status()).toBe(200)
    expect((await replayed.json()).assignment.id).toBe(assignment.id)
    await context.close()
  })

  test('[BDD-TEACHER-004] published classroom assignments are visible to an authorized student after refresh', async ({ browser }) => {
    const teacherContext = await browser.newContext()
    const teacher = await teacherContext.newPage()
    expect((await teacher.request.post('/api/auth/login', { data: { identifier: 'teacher@example.test', password: 'TeacherPass123!' } })).status()).toBe(200)

    const created = await teacher.request.post('/api/practicum/assignments', {
      headers: await csrfHeaders(teacher, { 'Idempotency-Key': `student-todo-${Date.now()}` }),
      data: { planId: 'plan-wdds', title: 'Server assignment for student', instructions: 'Complete the server-backed classroom assignment.', audience: 'ALL_STUDENTS' },
    })
    expect(created.status()).toBe(201)
    const assignment = (await created.json()).assignment
    expect((await teacher.request.post(`/api/practicum/assignments/${assignment.id}/publish`, { headers: await csrfHeaders(teacher) })).status()).toBe(200)

    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    expect((await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })).status()).toBe(200)
    const list = await student.request.get('/api/practicum/assignments')
    expect(list.status()).toBe(200)
    expect((await list.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({ id: assignment.id, status: 'PUBLISHED' })]))
    await studentContext.close()
    await teacherContext.close()
  })

  test('[BDD-STUDENT-006] student task page renders a published server assignment after refresh', async ({ browser }) => {
    const teacherContext = await browser.newContext()
    const teacher = await teacherContext.newPage()
    expect((await teacher.request.post('/api/auth/login', { data: { identifier: 'teacher@example.test', password: 'TeacherPass123!' } })).status()).toBe(200)
    const title = `Student task ${Date.now()}`
    const created = await teacher.request.post('/api/practicum/assignments', {
      headers: await csrfHeaders(teacher, { 'Idempotency-Key': `student-task-page-${Date.now()}` }),
      data: { planId: 'plan-wdds', title, instructions: 'Visible in the student task page after a refresh.', audience: 'ALL_STUDENTS' },
    })
    const assignment = (await created.json()).assignment
    expect((await teacher.request.post(`/api/practicum/assignments/${assignment.id}/publish`, { headers: await csrfHeaders(teacher) })).status()).toBe(200)

    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    expect((await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })).status()).toBe(200)
    await student.goto('/practicum/profile')
    await student.locator('[data-role-option="STUDENT"]').click()
    await student.goto('/practicum/tasks')
    await expect(student.locator('[data-student-tasks]')).toContainText(title)
    await student.reload()
    await expect(student.locator('[data-student-tasks]')).toContainText(title)
    await studentContext.close()
    await teacherContext.close()
  })
})
