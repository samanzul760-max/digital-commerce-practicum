import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'
import { loginAsOwner, loginAsStudent } from './auth-helpers'

test.describe('templates and competitions API contract', () => {
  test('[BDD-TEMPLATE-COMPETITION-001/002] owner disables a template and students cannot read it directly', async ({ page, browser }) => {
    await loginAsOwner(page)
    const templates = await page.request.get('/api/practicum/templates')
    expect(templates.ok()).toBeTruthy()
    const caseTemplate = (await templates.json()).items.find((item: { key: string }) => item.key === 'commerce-cases')
    expect(caseTemplate).toEqual(expect.objectContaining({ id: expect.any(String), enabled: expect.any(Boolean) }))

    const update = await page.request.patch(`/api/practicum/templates/${caseTemplate.id}`, {
      headers: await csrfHeaders(page),
      data: { enabled: false },
    })
    expect(update.status()).toBe(200)
    expect((await update.json()).template.enabled).toBe(false)

    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    await loginAsStudent(student)
    const list = await student.request.get('/api/practicum/templates')
    expect((await list.json()).items).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: caseTemplate.id })]))
    const detail = await student.request.get(`/api/practicum/templates/${caseTemplate.id}`)
    expect(detail.status()).toBe(403)
    expect((await detail.json()).data.code).toBe('TEMPLATE_DISABLED')
    const restored = await page.request.patch(`/api/practicum/templates/${caseTemplate.id}`, {
      headers: await csrfHeaders(page),
      data: { enabled: true },
    })
    expect(restored.status()).toBe(200)
    await studentContext.close()
  })

  test('[BDD-TEMPLATE-COMPETITION-003/006] student template writes require role and CSRF', async ({ page }) => {
    await loginAsStudent(page)
    const items = (await (await page.request.get('/api/practicum/templates')).json()).items
    const template = items[0]
    const missingCsrf = await page.request.patch(`/api/practicum/templates/${template.id}`, { data: { enabled: false } })
    expect(missingCsrf.status()).toBe(403)
    expect((await missingCsrf.json()).data.code).toBe('CSRF_INVALID')

    const forbidden = await page.request.patch(`/api/practicum/templates/${template.id}`, {
      headers: await csrfHeaders(page),
      data: { enabled: false },
    })
    expect(forbidden.status()).toBe(403)
    expect((await forbidden.json()).data.code).toBe('TEMPLATE_FORBIDDEN')
  })

  test('[BDD-TEMPLATE-COMPETITION-006] anonymous requests cannot read protected template data', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const response = await page.request.get('/api/practicum/templates')
    expect(response.status()).toBe(401)
    expect((await response.json()).data.code).toBe('AUTH_REQUIRED')
    await context.close()
  })

  test('[BDD-TEMPLATE-COMPETITION-004/005] owner publishes and closes a competition; student enters once', async ({ page, browser }) => {
    await loginAsOwner(page)
    const created = await page.request.post('/api/practicum/competitions', {
      headers: await csrfHeaders(page, { 'Idempotency-Key': `competition-${Date.now()}` }),
      data: { roomId: 'room-001', title: `选品挑战 ${Date.now()}`, description: '提交一个适合当前人群的选品方案。' },
    })
    expect(created.status()).toBe(201)
    const competition = (await created.json()).competition
    expect(competition.status).toBe('DRAFT')

    const published = await page.request.post(`/api/practicum/competitions/${competition.id}/publish`, { headers: await csrfHeaders(page) })
    expect((await published.json()).competition.status).toBe('PUBLISHED')

    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    await loginAsStudent(student)
    const firstEntry = await student.request.post(`/api/practicum/competitions/${competition.id}/entries`, {
      headers: await csrfHeaders(student),
    })
    expect(firstEntry.status()).toBe(201)
    expect((await firstEntry.json()).entry).toEqual(expect.objectContaining({ status: 'SUBMITTED', memberId: expect.any(String), submittedAt: expect.any(String) }))

    const duplicate = await student.request.post(`/api/practicum/competitions/${competition.id}/entries`, { headers: await csrfHeaders(student) })
    expect(duplicate.status()).toBe(409)
    expect((await duplicate.json()).data.code).toBe('COMPETITION_ENTRY_EXISTS')

    const closed = await page.request.post(`/api/practicum/competitions/${competition.id}/close`, { headers: await csrfHeaders(page) })
    expect((await closed.json()).competition.status).toBe('CLOSED')
    const afterClosed = await student.request.post(`/api/practicum/competitions/${competition.id}/entries`, { headers: await csrfHeaders(student) })
    expect(afterClosed.status()).toBe(409)
    expect((await afterClosed.json()).data.code).toBe('COMPETITION_STATE_INVALID')
    await studentContext.close()
  })
})
