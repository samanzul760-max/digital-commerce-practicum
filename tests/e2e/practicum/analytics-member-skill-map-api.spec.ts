import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'

test('owner reads a graded member skill map and students cannot access it', async ({ browser }) => {
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })
  const key = `skill-map-${Date.now()}`
  expect((await student.request.post('/api/practicum/submissions', {
    headers: await csrfHeaders(student, { 'Idempotency-Key': key }),
    data: { activityId: 'case-node-review-reply', text: 'Skill map evidence' },
  })).status()).toBe(201)

  const ownerContext = await browser.newContext()
  const owner = await ownerContext.newPage()
  await owner.request.post('/api/auth/login', { data: { identifier: 'owner@example.test', password: 'OwnerPass123!' } })
  expect((await owner.request.post('/api/practicum/submissions/case-node-review-reply/grade', {
    headers: await csrfHeaders(owner),
    data: { rubricScores: { 'case-rubric-reply-1': 25, 'case-rubric-reply-2': 35, 'case-rubric-reply-3': 25 }, feedback: 'Skill map grade' },
  })).status()).toBe(200)

  const ownerResponse = await owner.request.get('/api/practicum/analytics/members/member-001?roomId=room-001')
  expect(ownerResponse.status()).toBe(200)
  expect(await ownerResponse.json()).toEqual(expect.objectContaining({
    member: expect.objectContaining({ memberId: 'member-001' }),
    skillMap: expect.arrayContaining([expect.objectContaining({ skill: expect.any(String), score: expect.any(Number), mastery: expect.any(String), explanation: expect.any(String) })]),
    strengths: expect.any(Array),
    improvements: expect.any(Array),
  }))

  const forbidden = await student.request.get('/api/practicum/analytics/members/member-001?roomId=room-001')
  expect(forbidden.status()).toBe(403)
  expect((await forbidden.json()).data.code).toBe('MEMBER_ANALYTICS_FORBIDDEN')
  await ownerContext.close()
  await studentContext.close()
})
