import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'

test.describe('submission API contract', () => {
  test('student submits a practice version and owner can return then grade it', async ({ browser }) => {
    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })

    const ownerContext = await browser.newContext()
    const owner = await ownerContext.newPage()
    await owner.request.post('/api/auth/login', { data: { identifier: 'owner@example.test', password: 'OwnerPass123!' } })

    const created = await student.request.post('/api/practicum/submissions', {
      headers: await csrfHeaders(student, { 'Idempotency-Key': `submission-${Date.now()}` }),
      data: { activityId: 'case-node-review-reply', text: '服务端提交内容' },
    })
    expect(created.status()).toBe(201)
    const submission = (await created.json()).submission
    expect(submission).toEqual(expect.objectContaining({ status: 'SUBMITTED', versions: expect.any(Array) }))

    const detail = await owner.request.get('/api/practicum/submissions/case-node-review-reply')
    expect(detail.ok()).toBeTruthy()
    expect((await detail.json()).submission.versions.at(-1).text).toBe('服务端提交内容')

    const returned = await owner.request.post('/api/practicum/submissions/case-node-review-reply/return', { headers: await csrfHeaders(owner), data: { feedback: '请补充证据' } })
    expect(returned.ok()).toBeTruthy()
    expect((await returned.json()).submission.status).toBe('RETURNED')

    const revision = await student.request.post('/api/practicum/submissions', {
      headers: await csrfHeaders(student),
      data: { activityId: 'case-node-review-reply', text: '服务端修订内容' },
    })
    expect(revision.ok()).toBeTruthy()
    const revisionSubmission = (await revision.json()).submission
    expect(revisionSubmission.versions.length).toBeGreaterThanOrEqual(2)
    expect(revisionSubmission.versions.at(-1).text).toBe('服务端修订内容')

    const graded = await owner.request.post('/api/practicum/submissions/case-node-review-reply/grade', {
      headers: await csrfHeaders(owner),
      data: { rubricScores: { 'case-rubric-reply-1': 25, 'case-rubric-reply-2': 35, 'case-rubric-reply-3': 25 }, feedback: '已完成审核' },
    })
    expect(graded.ok()).toBeTruthy()
    expect((await graded.json()).submission).toEqual(expect.objectContaining({ status: 'GRADED', grade: expect.objectContaining({ feedback: '已完成审核' }) }))

    await studentContext.close()
    await ownerContext.close()
  })

  test('student cannot read the manager review queue', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })
    const response = await page.request.get('/api/practicum/submissions')
    expect(response.status()).toBe(403)
    expect((await response.json()).data.code).toBe('SUBMISSION_FORBIDDEN')
    await context.close()
  })
})
