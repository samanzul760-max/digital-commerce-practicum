import { expect, test, type Page } from '@playwright/test'
import { prisma } from '../../../server/db/client'
import { loginAsOwner, loginAsTeacher } from './auth-helpers'
import { csrfHeaders } from './csrf'

interface ClassroomFixture {
  id: string
}

async function createClassroom(page: Page, label: string): Promise<ClassroomFixture> {
  const cohort = await prisma.cohort.create({
    data: {
      organizationId: 'org-demo',
      name: `Teacher classroom ${label} ${Date.now()}`,
      startsAt: new Date('2026-08-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T00:00:00.000Z'),
    },
  })
  const response = await page.request.post('/api/practicum/classes', {
    headers: await csrfHeaders(page),
    data: {
      organizationId: 'org-demo',
      roomId: 'room-001',
      cohortId: cohort.id,
      name: `Teacher classroom ${label} ${Date.now()}`,
    },
  })
  expect(response.status()).toBe(201)
  return (await response.json()).class as ClassroomFixture
}

test.describe('teacher classroom closure contract', () => {
  test('[BDD-TEACHER-CLASSROOM-001][BDD-TEACHER-CLASSROOM-002] a teacher creates, publishes, closes, and cannot reopen an announcement', async ({ page }) => {
    await loginAsTeacher(page)
    const classroom = await createClassroom(page, 'announcement')
    const api = `/api/practicum/teacher/classes/${classroom.id}/announcements`
    const key = `announcement-${Date.now()}`

    const created = await page.request.post(api, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
      data: { title: '课堂提醒', content: '请在上课前完成准备。' },
    })
    expect(created.status()).toBe(201)
    const announcement = (await created.json()).announcement as { id: string; status: string }
    expect(announcement).toEqual(expect.objectContaining({ status: 'DRAFT' }))

    const replay = await page.request.post(api, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
      data: { title: '课堂提醒', content: '请在上课前完成准备。' },
    })
    expect(replay.status()).toBe(200)
    await expect(replay.json()).resolves.toEqual(expect.objectContaining({ announcement: expect.objectContaining({ id: announcement.id }), replayed: true }))

    const published = await page.request.post(api, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-publish` }),
      data: { announcementId: announcement.id, action: 'PUBLISH' },
    })
    expect(published.status()).toBe(200)
    await expect(published.json()).resolves.toEqual(expect.objectContaining({ announcement: expect.objectContaining({ id: announcement.id, status: 'PUBLISHED' }) }))

    const closed = await page.request.post(api, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-close` }),
      data: { announcementId: announcement.id, action: 'CLOSE' },
    })
    expect(closed.status()).toBe(200)

    const invalid = await page.request.post(api, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-reopen` }),
      data: { announcementId: announcement.id, action: 'PUBLISH' },
    })
    expect(invalid.status()).toBe(409)
    await expect(invalid.json()).resolves.toEqual(expect.objectContaining({ data: { code: 'TEACHING_STATE_INVALID' } }))
  })

  test('[BDD-TEACHER-CLASSROOM-003][BDD-TEACHER-CLASSROOM-005] a teacher starts and ends one idempotent session and reads server execution totals', async ({ page }) => {
    await loginAsTeacher(page)
    const classroom = await createClassroom(page, 'session')
    const api = `/api/practicum/teacher/classes/${classroom.id}/sessions`
    const key = `session-${Date.now()}`

    const started = await page.request.post(api, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
      data: { action: 'START', activityId: `activity-${key}` },
    })
    expect(started.status()).toBe(201)
    const session = (await started.json()).session as { id: string; status: string }
    expect(session).toEqual(expect.objectContaining({ status: 'ACTIVE' }))

    const replay = await page.request.post(api, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
      data: { action: 'START', activityId: `activity-${key}` },
    })
    expect(replay.status()).toBe(200)
    await expect(replay.json()).resolves.toEqual(expect.objectContaining({ session: expect.objectContaining({ id: session.id }), replayed: true }))

    const execution = await page.request.get(`/api/practicum/teacher/sessions/${session.id}/execution`)
    expect(execution.status()).toBe(200)
    await expect(execution.json()).resolves.toEqual(expect.objectContaining({
      session: expect.objectContaining({ id: session.id, currentActivityId: `activity-${key}` }),
      execution: expect.objectContaining({ total: expect.any(Number), notStarted: expect.any(Number), inProgress: expect.any(Number), completed: expect.any(Number) }),
    }))

    const ended = await page.request.post(api, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-end` }),
      data: { action: 'END', sessionId: session.id },
    })
    expect(ended.status()).toBe(200)
    await expect(ended.json()).resolves.toEqual(expect.objectContaining({ session: expect.objectContaining({ id: session.id, status: 'ENDED' }) }))
  })

  test('[BDD-TEACHER-CLASSROOM-004][BDD-TEACHER-CLASSROOM-006] a teacher cannot directly open an unassigned class and the workbench exposes protected states', async ({ page }) => {
    await loginAsOwner(page)
    const unassigned = await createClassroom(page, 'unassigned')
    await loginAsTeacher(page)

    const forbiddenApi = await page.request.get(`/api/practicum/teacher/classes/${unassigned.id}/sessions`)
    expect(forbiddenApi.status()).toBe(404)
    await expect(forbiddenApi.json()).resolves.toEqual(expect.objectContaining({ data: { code: 'CLASS_NOT_FOUND' } }))

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/practicum/teaching/${unassigned.id}`)
    await expect(page.locator('[data-forbidden]')).toBeVisible()
    await expect(page.locator('[data-teaching-workbench]')).toHaveCount(0)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
