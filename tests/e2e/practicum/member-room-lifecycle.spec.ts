import { expect, test } from '@playwright/test'
import { loginAsOwner, loginAsStudent, loginAsTeacher } from './auth-helpers'
import { csrfHeaders } from './csrf'

test.describe('member and training-room lifecycle contracts', () => {
  test('[MR-001] owner-scoped invitation is revoked and cannot be redeemed', async ({ browser, page }) => {
    await loginAsOwner(page)
    const created = await page.request.post('/api/practicum/members/invites', {
      headers: await csrfHeaders(page),
      data: { roomId: 'room-001', invitee: 'user-student-001', groupName: `contract-group-${Date.now()}` },
    })

    expect(created.status()).toBe(201)
    const invite = (await created.json()).invite as { id: string; code: string; status: string }
    expect(invite.status).toBe('ACTIVE')

    const revoked = await page.request.post(`/api/practicum/members/invites/${invite.id}/revoke`, {
      headers: await csrfHeaders(page),
    })
    expect(revoked.status()).toBe(200)
    expect((await revoked.json()).invite.status).toBe('REVOKED')

    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    await loginAsStudent(student)
    const redemption = await student.request.post('/api/practicum/members/invites/redeem', {
      headers: await csrfHeaders(student),
      data: { code: invite.code },
    })
    expect(redemption.status()).toBe(409)
    await studentContext.close()
  })

  test('[MR-002] duplicate approval is idempotent and assigns the requested virtual group', async ({ browser, page }) => {
    const groupName = `approval-group-${Date.now()}`
    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    await loginAsStudent(student)
    const submitted = await student.request.post('/api/practicum/members/applications', {
      headers: await csrfHeaders(student),
      data: { roomId: 'room-001', groupName },
    })
    expect(submitted.status()).toBe(201)
    const application = (await submitted.json()).application as { id: string }
    await studentContext.close()

    await loginAsOwner(page)
    const first = await page.request.post(`/api/practicum/members/applications/${application.id}/decision`, {
      headers: await csrfHeaders(page),
      data: { roomId: 'room-001', decision: 'APPROVED' },
    })
    expect(first.status()).toBe(200)
    const firstBody = await first.json()
    expect(firstBody.application).toMatchObject({ id: application.id, status: 'APPROVED' })
    expect(firstBody.member.group).toBe(groupName)

    const repeated = await page.request.post(`/api/practicum/members/applications/${application.id}/decision`, {
      headers: await csrfHeaders(page),
      data: { roomId: 'room-001', decision: 'APPROVED' },
    })
    expect(repeated.status()).toBe(200)
    expect((await repeated.json()).member.id).toBe(firstBody.member.id)
  })

  test('[MR-003] non-owner and cross-room owner access are rejected by the server', async ({ page }) => {
    await loginAsTeacher(page)
    const teacherWrite = await page.request.put('/api/practicum/room-settings', {
      headers: await csrfHeaders(page),
      data: { roomId: 'room-001', description: 'forbidden', promotionalMediaUrl: '', teachingMode: 'STANDARD', visibility: 'PRIVATE' },
    })
    expect(teacherWrite.status()).toBe(403)

    await loginAsOwner(page)
    const crossRoom = await page.request.get('/api/practicum/room-settings?roomId=room-outside-owner-scope')
    expect(crossRoom.status()).toBe(403)
  })

  test('[MR-004] room settings survive a page refresh and no local fallback is rendered on request failure', async ({ page }) => {
    await loginAsOwner(page)
    const description = `persisted room description ${Date.now()}`
    const saved = await page.request.put('/api/practicum/room-settings', {
      headers: await csrfHeaders(page),
      data: { roomId: 'room-001', description, promotionalMediaUrl: 'https://example.test/room-media', teachingMode: 'STANDARD', visibility: 'PRIVATE' },
    })
    expect(saved.status()).toBe(200)

    await page.goto('/practicum/room-settings')
    await expect(page.locator('[data-room-introduction]')).toHaveValue(description)
    await page.reload()
    await expect(page.locator('[data-room-introduction]')).toHaveValue(description)

    await page.route('**/api/practicum/room-settings*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
    await page.goto('/practicum/room-settings')
    await expect(page.locator('[data-room-settings-error]')).toBeVisible()
    await expect(page.locator('[data-room-introduction]')).toHaveCount(0)
  })
})

// Deferred verification only. Do not run in this slice:
// npx playwright test tests/e2e/practicum/member-room-lifecycle.spec.ts
