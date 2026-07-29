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

    const audited = await owner.request.get('/api/practicum/submissions/case-node-review-reply')
    expect(audited.ok()).toBeTruthy()
    expect((await audited.json()).auditEvents.map((event: { action: string }) => event.action)).toEqual(['RETURNED', 'GRADED'])

    await studentContext.close()
    await ownerContext.close()
  })

  test('[BDD-REVIEW-011] owner sees server audit history after return and final grading', async ({ browser }) => {
    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    expect((await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })).status()).toBe(200)

    const ownerContext = await browser.newContext()
    const owner = await ownerContext.newPage()
    expect((await owner.request.post('/api/auth/login', { data: { identifier: 'owner@example.test', password: 'OwnerPass123!' } })).status()).toBe(200)

    const key = `audit-history-${Date.now()}`
    const planResponse = await owner.request.post('/api/practicum/plans', {
      headers: await csrfHeaders(owner, { 'Idempotency-Key': key }),
      data: { roomId: 'room-001', title: `Audit history ${key}`, description: 'Isolated review audit evidence.' },
    })
    expect(planResponse.status()).toBe(201)
    const plan = (await planResponse.json()).plan
    const moduleResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
      headers: await csrfHeaders(owner),
      data: { title: 'Audit module', level: 1, parentId: null, version: plan.version },
    })
    expect(moduleResponse.status()).toBe(201)
    const moduleSnapshot = await moduleResponse.json()
    const module = moduleSnapshot.nodes.find((node: { level: number }) => node.level === 1)
    const unitResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
      headers: await csrfHeaders(owner),
      data: { title: 'Audit unit', level: 2, parentId: module.id, version: moduleSnapshot.plan.version },
    })
    expect(unitResponse.status()).toBe(201)
    const unitSnapshot = await unitResponse.json()
    const unit = unitSnapshot.nodes.find((node: { level: number }) => node.level === 2)
    const activityResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/activities`, {
      headers: await csrfHeaders(owner),
      data: { parentId: unit.id, title: 'Audit practice', type: 'PRACTICE_ACTIVITY', version: unitSnapshot.plan.version },
    })
    expect(activityResponse.status()).toBe(201)
    const activitySnapshot = await activityResponse.json()
    const activityId = activitySnapshot.nodes.find((node: { level: number }) => node.level === 3).id
    expect((await owner.request.post(`/api/practicum/plans/${plan.id}/publish`, { headers: await csrfHeaders(owner) })).status()).toBe(200)

    expect((await student.request.post('/api/practicum/submissions', {
      headers: await csrfHeaders(student, { 'Idempotency-Key': `${key}-submission` }),
      data: { activityId, text: 'Audit history first version' },
    })).status()).toBe(201)
    expect((await owner.request.post(`/api/practicum/submissions/${activityId}/return`, {
      headers: await csrfHeaders(owner),
      data: { feedback: 'Please add evidence for the audit history.' },
    })).status()).toBe(200)
    expect((await student.request.post('/api/practicum/submissions', {
      headers: await csrfHeaders(student),
      data: { activityId, text: 'Audit history revised version' },
    })).status()).toBe(201)
    expect((await owner.request.post(`/api/practicum/submissions/${activityId}/grade`, {
      headers: await csrfHeaders(owner),
      data: { rubricScores: {}, feedback: 'Audit history final grade.' },
    })).status()).toBe(200)

    await owner.goto(`/practicum/submissions/${activityId}`)
    const history = owner.locator('[data-audit-history]')
    await expect(history).toBeVisible()
    await expect(history.locator('[data-audit-event]')).toHaveCount(2)
    await expect(history).toContainText('已退回')
    await expect(history).toContainText('已评分')
    await owner.reload()
    await expect(owner.locator('[data-audit-history]')).toContainText('已评分')

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

  test('[BDD-SUBMISSION-005] submission detail never renders browser-only stale evidence', async ({ browser }) => {
    const context = await browser.newContext()
    const owner = await context.newPage()
    expect((await owner.request.post('/api/auth/login', { data: { identifier: 'owner@example.test', password: 'OwnerPass123!' } })).status()).toBe(200)
    await owner.goto('/practicum/submissions/local-only-submission')
    await owner.evaluate(() => {
      localStorage.setItem('digital-commerce-practicum.v1', JSON.stringify({
        schemaVersion: 1,
        activeRole: 'OWNER',
        practiceSubmissions: {
          'local-only-submission': {
            status: 'SUBMITTED',
            studentId: 'local-student',
            studentLabel: 'Local-only student',
            versions: [{ id: 'local-version', submissionId: 'local-only-submission', version: 1, text: 'Stale browser-only evidence', links: [], attachments: [], submittedAt: '2026-07-29T00:00:00.000Z' }],
          },
        },
        nodes: [{ id: 'local-only-submission', planId: 'local-only-plan', parentId: 'local-unit', level: 3, title: 'Local-only activity', description: '', sort: 1, activityId: 'activity-local-only', activityType: 'PRACTICE_ACTIVITY' }],
        activities: [{ id: 'activity-local-only', type: 'PRACTICE_ACTIVITY', title: 'Local-only activity', objective: '', instructions: [], required: true, resourceIds: [], config: { type: 'PRACTICE_ACTIVITY', deliverables: [], rubric: [] } }],
      }))
    })
    await owner.reload()
    await expect(owner.locator('[data-submission-detail]')).toHaveCount(0)
    await expect(owner.locator('[data-empty]')).toBeVisible()
    await expect(owner.locator('[data-practicum-content]')).not.toContainText('Stale browser-only evidence')
    await context.close()
  })

  test('[BDD-SUBMISSION-005] student activity never renders browser-only stale submission status', async ({ browser }) => {
    const context = await browser.newContext()
    const student = await context.newPage()
    expect((await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })).status()).toBe(200)
    await student.goto('/practicum/activities/act-01-003')
    await student.evaluate(() => {
      localStorage.setItem('digital-commerce-practicum.v1', JSON.stringify({
        schemaVersion: 1,
        activeRole: 'STUDENT',
        practiceSubmissions: {
          'act-01-003': {
            status: 'SUBMITTED',
            versions: [{ id: 'local-version', submissionId: 'act-01-003', version: 1, text: 'Stale local student submission', links: [], attachments: [], submittedAt: '2026-07-29T00:00:00.000Z' }],
          },
        },
        plans: [{ id: 'plan-local', roomId: 'room-001', title: 'Local plan', description: '', status: 'PUBLISHED', sort: 1, moduleIds: [], createdAt: '2026-07-29T00:00:00.000Z', updatedAt: '2026-07-29T00:00:00.000Z' }],
        nodes: [{ id: 'act-01-003', planId: 'plan-local', parentId: 'unit-local', level: 3, title: 'Local practice activity', description: '', sort: 1, activityId: 'activity-act-01-003', activityType: 'PRACTICE_ACTIVITY' }],
        activities: [{ id: 'activity-act-01-003', type: 'PRACTICE_ACTIVITY', title: 'Local practice activity', objective: '', instructions: [], required: true, resourceIds: [], config: { type: 'PRACTICE_ACTIVITY', deliverables: [], rubric: [] } }],
      }))
    })
    await student.reload()
    await expect(student.locator('[data-submission-status]')).toHaveCount(0)
    await expect(student.locator('[data-activity-page]')).not.toContainText('Stale local student submission')
    await context.close()
  })

  test('[BDD-REVIEW-010] owner filters the server review queue by plan', async ({ browser }) => {
    const ownerContext = await browser.newContext()
    const owner = await ownerContext.newPage()
    expect((await owner.request.post('/api/auth/login', { data: { identifier: 'owner@example.test', password: 'OwnerPass123!' } })).status()).toBe(200)
    const key = `review-plan-filter-${Date.now()}`
    const createReviewablePlan = async (suffix: string) => {
      const created = await owner.request.post('/api/practicum/plans', {
        headers: await csrfHeaders(owner, { 'Idempotency-Key': `${key}-${suffix}` }),
        data: { roomId: 'room-001', title: `Review filter ${suffix} ${key}`, description: 'A published plan used to verify the server review queue filter.' },
      })
      expect(created.status()).toBe(201)
      const plan = (await created.json()).plan
      const moduleResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
        headers: await csrfHeaders(owner),
        data: { title: `Module ${suffix}`, level: 1, parentId: null, version: plan.version },
      })
      expect(moduleResponse.status()).toBe(201)
      const moduleSnapshot = await moduleResponse.json()
      const module = moduleSnapshot.nodes.find((node: { level: number }) => node.level === 1)
      const unitResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
        headers: await csrfHeaders(owner),
        data: { title: `Unit ${suffix}`, level: 2, parentId: module.id, version: moduleSnapshot.plan.version },
      })
      expect(unitResponse.status()).toBe(201)
      const unitSnapshot = await unitResponse.json()
      const unit = unitSnapshot.nodes.find((node: { level: number }) => node.level === 2)
      const activityResponse = await owner.request.post(`/api/practicum/plans/${plan.id}/activities`, {
        headers: await csrfHeaders(owner),
        data: { parentId: unit.id, title: `Practice ${suffix}`, type: 'PRACTICE_ACTIVITY', version: unitSnapshot.plan.version },
      })
      expect(activityResponse.status()).toBe(201)
      const activitySnapshot = await activityResponse.json()
      const activity = activitySnapshot.nodes.find((node: { level: number }) => node.level === 3)
      expect((await owner.request.post(`/api/practicum/plans/${plan.id}/publish`, { headers: await csrfHeaders(owner) })).status()).toBe(200)
      return { plan, unit, activity }
    }

    const first = await createReviewablePlan('first')
    const second = await createReviewablePlan('second')
    const studentContext = await browser.newContext()
    const student = await studentContext.newPage()
    expect((await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })).status()).toBe(200)
    expect((await student.request.post('/api/practicum/submissions', { headers: await csrfHeaders(student, { 'Idempotency-Key': `${key}-first-submission` }), data: { activityId: first.activity.id, text: 'First plan queue evidence' } })).status()).toBe(201)
    expect((await student.request.post('/api/practicum/submissions', { headers: await csrfHeaders(student, { 'Idempotency-Key': `${key}-second-submission` }), data: { activityId: second.activity.id, text: 'Second plan queue evidence' } })).status()).toBe(201)

    const response = await owner.request.get(`/api/practicum/submissions?planId=${first.plan.id}`)
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.items).toEqual(expect.arrayContaining([expect.objectContaining({ planId: first.plan.id, activityId: first.activity.id })]))
    expect(body.items).not.toEqual(expect.arrayContaining([expect.objectContaining({ planId: second.plan.id, activityId: second.activity.id })]))

    const unitResponse = await owner.request.get(`/api/practicum/submissions?unitId=${first.unit.id}`)
    expect(unitResponse.status()).toBe(200)
    const unitBody = await unitResponse.json()
    expect(unitBody.items).toEqual(expect.arrayContaining([expect.objectContaining({ unitId: first.unit.id, activityId: first.activity.id })]))
    expect(unitBody.items).not.toEqual(expect.arrayContaining([expect.objectContaining({ unitId: second.unit.id, activityId: second.activity.id })]))

    const unmatchedStudent = await owner.request.get('/api/practicum/submissions?student=not-a-submitter')
    expect(unmatchedStudent.status()).toBe(200)
    expect((await unmatchedStudent.json()).items).toEqual([])

    const newestFirst = await owner.request.get('/api/practicum/submissions?sort=newest')
    expect(newestFirst.status()).toBe(200)
    expect((await newestFirst.json()).items.slice(0, 2).map((item: { activityId: string }) => item.activityId)).toEqual([second.activity.id, first.activity.id])

    await owner.goto('/practicum/reviews')
    await expect(owner.locator('[data-review-queue]')).toBeVisible()
    await owner.locator('[data-plan-filter]').selectOption(first.plan.id)
    await expect(owner.locator('[data-review-row]')).toHaveCount(1)
    await expect(owner.locator('[data-review-row]')).toContainText('Practice first')
    await owner.reload()
    await expect(owner.locator('[data-review-row]').filter({ hasText: 'Practice first' })).toBeVisible()
    await ownerContext.close()
    await studentContext.close()
  })
})
