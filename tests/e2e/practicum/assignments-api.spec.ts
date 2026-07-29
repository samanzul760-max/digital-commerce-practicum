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
})
