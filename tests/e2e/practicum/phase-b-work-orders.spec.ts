import { expect, test, type Page } from '@playwright/test'
import { csrfHeaders } from './csrf'

async function login(page: Page, role: 'ADMIN' | 'STUDENT' = 'ADMIN') {
  const response = await page.request.post('/api/auth/login', {
    data: role === 'ADMIN'
      ? { identifier: 'admin', password: process.env.SEED_ADMIN_PASSWORD }
      : { identifier: 'student1', password: process.env.SEED_STUDENT1_PASSWORD },
  })
  expect(response.status()).toBe(200)
}

function validSections(resourceId: string) {
  return [
    {
      clientKey: 'work-order', type: 'WORK_ORDER', title: '网店开通综合工单', description: '完成开店、设置与理论考核。', sort: 0, required: true, weightPercent: 0,
    },
    {
      clientKey: 'sandbox', parentClientKey: 'work-order', resourceId, type: 'SANDBOX', title: '店铺基础设置', description: '完成店铺信息与运费设置。', sort: 1, required: true, weightPercent: 70,
      sandbox: {
        sandboxType: 'STORE_BASICS', appKey: 'store-basics',
        steps: [{ title: '完善店铺信息', instruction: '填写店铺名称并保存。', sort: 0, required: true, fields: [{ key: 'shopName', label: '店铺名称', required: true }], evidenceKey: 'shop-profile' }],
        rubricItems: [{ title: '店铺信息完整', description: '名称符合任务要求。', points: 70, sort: 0 }],
      },
    },
    {
      clientKey: 'quiz', parentClientKey: 'work-order', type: 'QUIZ', title: '基础理论考核', description: '完成客观题。', sort: 2, required: true, weightPercent: 30,
      questions: [{ type: 'SINGLE', prompt: '发布商品前应先完成哪项设置？', options: [{ key: 'A', text: '运费模板' }, { key: 'B', text: '随意定价' }], answerKey: { answers: ['A'] }, explanation: '运费模板是履约基础。', points: 30, sort: 0, required: true }],
    },
  ]
}

test.describe('LearnEC Phase B work-order closure', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
  })

  test('ADMIN composes, previews, templates and publishes one StudentTask idempotently', async ({ page }) => {
    await login(page)

    const emptyTitleResponse = await page.request.post('/api/admin/tasks', {
      headers: await csrfHeaders(page, { 'Idempotency-Key': 'phase-b-empty-title-001' }),
      data: { classId: 'class-e2e-001', title: '   ' },
    })
    expect(emptyTitleResponse.status()).toBe(422)
    expect((await emptyTitleResponse.json()).data.code).toBe('WORK_ORDER_INVALID')

    const foreignClassResponse = await page.request.post('/api/admin/tasks', {
      headers: await csrfHeaders(page, { 'Idempotency-Key': 'phase-b-foreign-class-001' }),
      data: { classId: 'class-e2e-foreign', title: '越权工单' },
    })
    expect(foreignClassResponse.status()).toBe(404)
    expect((await foreignClassResponse.json()).data.code).toBe('CLASS_NOT_FOUND')

    const classesResponse = await page.request.get('/api/admin/classes')
    expect(classesResponse.status()).toBe(200)
    const classes = (await classesResponse.json()).classes as Array<{ id: string }>
    expect(classes.some(item => item.id === 'class-e2e-001')).toBe(true)

    const resourcesResponse = await page.request.get('/api/admin/resources')
    expect(resourcesResponse.status()).toBe(200)
    const resources = (await resourcesResponse.json()).resources as Array<{ id: string; source: string }>
    expect(new Set(resources.map(item => item.source))).toEqual(new Set(['SOFTWARE_CENTER', 'SKILL_CAMP', 'ENTERPRISE_TASK_LIBRARY']))
    const sandboxResource = resources.find(item => item.source === 'SKILL_CAMP')
    expect(sandboxResource).toBeTruthy()

    const createResponse = await page.request.post('/api/admin/tasks', {
      headers: await csrfHeaders(page, { 'Idempotency-Key': 'phase-b-create-001' }),
      data: { classId: 'class-e2e-001', title: '新零售开店综合实训', description: '媒体、理论和实操组合工单。' },
    })
    expect(createResponse.status()).toBe(201)
    const created = (await createResponse.json()).task as { id: string }

    const invalidWeight = await page.request.patch(`/api/admin/tasks/${created.id}`, {
      headers: await csrfHeaders(page),
      data: { autoScoreWeight: 60, manualScoreWeight: 30, sections: validSections(sandboxResource!.id) },
    })
    expect(invalidWeight.status()).toBe(422)
    expect((await invalidWeight.json()).data.code).toBe('WORK_ORDER_WEIGHT_INVALID')

    const updateResponse = await page.request.patch(`/api/admin/tasks/${created.id}`, {
      headers: await csrfHeaders(page),
      data: { autoScoreWeight: 70, manualScoreWeight: 30, timeLimitMinutes: 90, sections: validSections(sandboxResource!.id) },
    })
    expect(updateResponse.status()).toBe(200)
    const persisted = (await updateResponse.json()).task as { sections: Array<{ type: string; sandbox?: { steps: unknown[] } }> }
    expect(persisted.sections.map(section => section.type)).toEqual(['WORK_ORDER', 'SANDBOX', 'QUIZ'])
    expect(persisted.sections[1].sandbox?.steps).toHaveLength(1)

    const roundTripResponse = await page.request.get(`/api/admin/tasks/${created.id}`)
    expect(roundTripResponse.status()).toBe(200)
    expect((await roundTripResponse.json()).task.sections).toHaveLength(3)

    const previewResponse = await page.request.get(`/api/admin/tasks/${created.id}/preview`)
    expect(previewResponse.status()).toBe(200)
    const previewText = JSON.stringify(await previewResponse.json())
    expect(previewText).toContain('发布商品前应先完成哪项设置')
    expect(previewText).not.toContain('answerKey')

    const templateHeaders = await csrfHeaders(page, { 'Idempotency-Key': 'phase-b-template-001' })
    const templateResponse = await page.request.post('/api/admin/task-templates', {
      headers: templateHeaders,
      data: { taskId: created.id, title: '新零售开店模板' },
    })
    expect(templateResponse.status()).toBe(201)
    const template = (await templateResponse.json()).template as { id: string }

    const templateReplayResponse = await page.request.post('/api/admin/task-templates', {
      headers: templateHeaders,
      data: { taskId: created.id, title: '不会创建第二份的名称' },
    })
    expect(templateReplayResponse.status()).toBe(200)
    expect((await templateReplayResponse.json()).template.id).toBe(template.id)

    const templatesResponse = await page.request.get('/api/admin/task-templates')
    expect(templatesResponse.status()).toBe(200)
    expect(((await templatesResponse.json()).templates as Array<{ id: string }>).some(item => item.id === template.id)).toBe(true)

    const copyResponse = await page.request.post(`/api/admin/task-templates/${template.id}/copy`, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': 'phase-b-copy-001' }),
      data: { classId: 'class-e2e-001', title: '新零售开店模板副本' },
    })
    expect(copyResponse.status()).toBe(201)
    expect((await copyResponse.json()).task.status).toBe('DRAFT')

    const publishHeaders = await csrfHeaders(page, { 'Idempotency-Key': 'phase-b-publish-001' })
    const schedule = { classId: 'class-e2e-001', availableAt: '2026-08-10T08:00:00.000Z', dueAt: '2026-08-20T08:00:00.000Z', lateAllowed: false }
    const publishResponse = await page.request.post(`/api/admin/tasks/${created.id}/publish`, { headers: publishHeaders, data: schedule })
    expect(publishResponse.status()).toBe(201)
    expect((await publishResponse.json()).taskCount).toBe(1)

    const replayResponse = await page.request.post(`/api/admin/tasks/${created.id}/publish`, { headers: publishHeaders, data: schedule })
    expect(replayResponse.status()).toBe(200)
    expect((await replayResponse.json()).taskCount).toBe(1)

    const publicationResponse = await page.request.get(`/api/admin/tasks/${created.id}/publications`)
    expect(publicationResponse.status()).toBe(200)
    expect((await publicationResponse.json()).publication.taskCount).toBe(1)

    const trainingCentersResponse = await page.request.get('/api/admin/training-centers')
    expect(trainingCentersResponse.status()).toBe(200)
    expect((await trainingCentersResponse.json()).centers).toHaveLength(3)
  })

  test('STUDENT cannot access Phase B ADMIN APIs', async ({ page }) => {
    await login(page, 'STUDENT')
    const response = await page.request.get('/api/admin/resources')
    expect(response.status()).toBe(403)
    const trainingCentersResponse = await page.request.get('/api/admin/training-centers')
    expect(trainingCentersResponse.status()).toBe(403)
  })

  test('ADMIN sees the real work-order and classified training-center pages', async ({ page }) => {
    await login(page)
    await page.goto('/admin/tasks')
    await expect(page.locator('[data-work-order-list]')).toBeVisible()
    await expect(page.getByRole('link', { name: '新建综合任务' })).toBeVisible()

    await page.goto('/admin/tasks/new')
    await expect(page.locator('[data-work-order-create]')).toBeVisible()

    await page.goto('/admin/training-centers')
    await expect(page.locator('[data-training-center-type]')).toHaveCount(3)
  })

  test('ADMIN creates, previews and publishes a resource-composed work order from the UI', async ({ page }) => {
    await login(page)
    await page.goto('/admin/tasks/new')
    await expect(page.locator('[data-work-order-create]')).toBeVisible()

    await page.locator('[data-work-order-title]').fill('页面端综合工单')
    await page.locator('[data-work-order-class]').selectOption('class-e2e-001')
    await page.locator('[data-resource-add]').first().click()
    await page.locator('[data-add-quiz]').click()
    await page.locator('[data-section-weight]').nth(0).fill('70')
    await page.locator('[data-section-weight]').nth(1).fill('30')
    await page.locator('[data-quiz-prompt]').fill('开店前需要准备什么？')
    await page.locator('[data-quiz-answer]').fill('A')
    await page.locator('[data-save-work-order]').click()

    await expect(page).toHaveURL(/\/admin\/tasks\/[^/]+\/edit$/)
    await expect(page.locator('[data-save-state]')).toContainText('已保存')
    await page.locator('[data-preview-work-order]').click()
    await expect(page).toHaveURL(/\/preview$/)
    await expect(page.getByText('开店前需要准备什么？')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('"answerKey"')

    await page.locator('[data-open-publication]').click()
    await page.locator('[data-publish-work-order]').click()
    await expect(page.locator('[data-publication-result]')).toContainText('1 名学生')
    await page.reload()
    await expect(page.locator('[data-publication-count]')).toContainText('1')
  })
})
