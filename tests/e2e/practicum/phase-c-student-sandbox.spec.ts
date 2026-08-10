import { expect, test, type Page } from '@playwright/test'
import { csrfHeaders } from './csrf'

let scenarioSequence = 0

async function login(page: Page, role: 'ADMIN' | 'STUDENT') {
  await page.context().clearCookies()
  const response = await page.request.post('/api/auth/login', {
    data: role === 'ADMIN'
      ? { identifier: 'admin', password: process.env.SEED_ADMIN_PASSWORD }
      : { identifier: 'student1', password: process.env.SEED_STUDENT1_PASSWORD },
  })
  expect(response.status()).toBe(200)
}

function sandboxSection(clientKey: string, sort: number, sandboxType: string, title: string) {
  return {
    clientKey,
    parentClientKey: 'work-order',
    type: 'SANDBOX',
    title,
    description: `完成${title}的受控操作并留存证据。`,
    sort,
    required: true,
    weightPercent: 20,
    sandbox: {
      sandboxType,
      appKey: sandboxType.toLowerCase().replaceAll('_', '-'),
      steps: [{
        title: `完成${title}`,
        instruction: `根据指导完成${title}配置并保存。`,
        sort: 0,
        required: true,
        fields: [{ key: 'result', label: '完成结果', required: true }],
        evidenceKey: `${clientKey}-result`,
      }],
      rubricItems: [{ title: `${title}配置完整`, description: '字段完整且符合教学要求。', points: 20, sort: 0 }],
    },
  }
}

async function publishFiveSandboxTask(page: Page) {
  scenarioSequence += 1
  const suffix = `${scenarioSequence}-${Date.now()}`
  await login(page, 'ADMIN')
  const createdResponse = await page.request.post('/api/admin/tasks', {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `phase-c-create-${suffix}` }),
    data: {
      classId: 'class-e2e-001',
      title: `阶段 C 五模块工单 ${suffix}`,
      description: '依次完成店铺基础、商品、装修、营销和经营分析。',
      timeLimitMinutes: 120,
    },
  })
  expect(createdResponse.status()).toBe(201)
  const taskId = (await createdResponse.json()).task.id as string
  const sections = [
    { clientKey: 'work-order', type: 'WORK_ORDER', title: '五模块综合实训', description: '完成全部五个模块。', sort: 0, required: true, weightPercent: 0 },
    sandboxSection('store', 1, 'STORE_BASICS', '店铺基础'),
    sandboxSection('product', 2, 'PRODUCT_MANAGEMENT', '商品管理'),
    sandboxSection('decoration', 3, 'STORE_DECORATION', '店铺装修'),
    sandboxSection('marketing', 4, 'MARKETING', '营销活动'),
    sandboxSection('analytics', 5, 'BUSINESS_ANALYTICS', '经营分析'),
  ]
  const updateResponse = await page.request.patch(`/api/admin/tasks/${taskId}`, {
    headers: await csrfHeaders(page),
    data: { autoScoreWeight: 70, manualScoreWeight: 30, timeLimitMinutes: 120, sections },
  })
  expect(updateResponse.status()).toBe(200)
  const publishResponse = await page.request.post(`/api/admin/tasks/${taskId}/publish`, {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `phase-c-publish-${suffix}` }),
    data: {
      classId: 'class-e2e-001',
      availableAt: '2026-08-10T00:00:00.000Z',
      dueAt: '2026-12-31T23:59:59.000Z',
      lateAllowed: false,
    },
  })
  expect(publishResponse.status()).toBe(201)
  await login(page, 'STUDENT')
  const assignmentsResponse = await page.request.get('/api/center/assignments?status=AVAILABLE')
  expect(assignmentsResponse.status()).toBe(200)
  const assignments = (await assignmentsResponse.json()).assignments as Array<{ id: string; assignmentId: string }>
  const assignment = assignments.find(item => item.assignmentId === taskId)
  expect(assignment).toBeTruthy()
  return assignment!.id
}

function valuesFor(type: string) {
  const common = { result: 'completed' }
  if (type === 'STORE_BASICS') return { ...common, storeName: '校园优选店', businessCategory: '校园生活', withdrawalAccount: '62220001', freightTemplateName: '全国包邮', freightChargeType: 'PIECE' }
  if (type === 'PRODUCT_MANAGEMENT') return { ...common, productTitle: '校园随行杯', category: '日用百货', price: 29.9, stock: 100, warningStock: 10, reviewReply: '感谢支持' }
  if (type === 'STORE_DECORATION') return { ...common, deviceMode: 'MOBILE', components: [{ id: 'poster-1', type: 'POSTER', title: '开学季海报', position: 0, style: { theme: 'red', columns: 1 } }] }
  if (type === 'MARKETING') return { ...common, activityType: 'COUPON', activityName: '新生优惠券', discountValue: 10, startsAt: '2026-08-10T08:00:00.000Z', endsAt: '2026-08-20T08:00:00.000Z', productName: '校园随行杯' }
  return { ...common, selectedMetric: 'VISITORS', analysisNote: '访客量连续增长，随行杯销量排名第一。' }
}

test.describe('LearnEC Phase C student assignment and sandbox closure', () => {
  test('STUDENT lists and filters only owned StudentTask rows while ADMIN is forbidden', async ({ page }) => {
    const studentTaskId = await publishFiveSandboxTask(page)
    const allResponse = await page.request.get('/api/center/assignments')
    expect(allResponse.status()).toBe(200)
    expect(((await allResponse.json()).assignments as Array<{ id: string }>).some(item => item.id === studentTaskId)).toBe(true)

    const filteredResponse = await page.request.get('/api/center/assignments?status=AVAILABLE')
    expect(filteredResponse.status()).toBe(200)
    expect(((await filteredResponse.json()).assignments as Array<{ status: string }>).every(item => item.status === 'AVAILABLE')).toBe(true)

    const foreignResponse = await page.request.get('/api/center/student-tasks/not-owned-task')
    expect(foreignResponse.status()).toBe(404)
    await login(page, 'ADMIN')
    expect((await page.request.get('/api/center/assignments')).status()).toBe(403)
  })

  test('STUDENT persists five scoped sandboxes, receives exact missing items, and submits idempotently', async ({ page }) => {
    const studentTaskId = await publishFiveSandboxTask(page)
    const startResponse = await page.request.post(`/api/center/student-tasks/${studentTaskId}/start`, { headers: await csrfHeaders(page, { 'Idempotency-Key': 'phase-c-start-001' }) })
    expect(startResponse.status()).toBe(200)
    expect((await startResponse.json()).task.status).toBe('IN_PROGRESS')

    const detailResponse = await page.request.get(`/api/center/student-tasks/${studentTaskId}`)
    expect(detailResponse.status()).toBe(200)
    const detailText = JSON.stringify(await detailResponse.json())
    expect(detailText).not.toContain('answerKey')
    const detail = JSON.parse(detailText) as { sections: Array<{ id: string; sandbox: { sandboxType: string; steps: Array<{ id: string }> } }> }
    expect(detail.sections.filter(section => section.sandbox)).toHaveLength(5)

    const incompleteResponse = await page.request.post(`/api/center/student-tasks/${studentTaskId}/submissions`, {
      headers: await csrfHeaders(page, { 'Idempotency-Key': 'phase-c-incomplete-001' }),
    })
    expect(incompleteResponse.status()).toBe(422)
    const incomplete = await incompleteResponse.json()
    expect(incomplete.data.code).toBe('TASK_INCOMPLETE')
    expect(incomplete.data.missingItems).toHaveLength(5)

    for (const section of detail.sections.filter(item => item.sandbox)) {
      const saveResponse = await page.request.post(`/api/center/student-tasks/${studentTaskId}/draft`, {
        headers: await csrfHeaders(page),
        data: {
          sectionId: section.id,
          values: valuesFor(section.sandbox.sandboxType),
          completedStepIds: section.sandbox.steps.map(step => step.id),
        },
      })
      expect(saveResponse.status()).toBe(200)
      expect((await saveResponse.json()).snapshot.studentTaskId).toBe(studentTaskId)
    }

    const submitHeaders = await csrfHeaders(page, { 'Idempotency-Key': 'phase-c-submit-001' })
    const submitResponse = await page.request.post(`/api/center/student-tasks/${studentTaskId}/submissions`, { headers: submitHeaders })
    expect(submitResponse.status()).toBe(201)
    const submitted = await submitResponse.json()
    expect(submitted.task.status).toBe('SUBMITTED')
    expect(submitted.submission.currentVersion).toBe(1)
    expect(submitted.submission.latestVersion.artifact.sections).toBeTruthy()
    expect(JSON.stringify(submitted.submission.latestVersion.artifact)).toContain('开学季海报')
    expect(JSON.stringify(submitted.submission.latestVersion.artifact)).toContain('新生优惠券')

    const replayResponse = await page.request.post(`/api/center/student-tasks/${studentTaskId}/submissions`, { headers: submitHeaders })
    expect(replayResponse.status()).toBe(200)
    expect((await replayResponse.json()).submission.currentVersion).toBe(1)

    const refreshed = await page.request.get(`/api/center/student-tasks/${studentTaskId}`)
    expect((await refreshed.json()).task.status).toBe('SUBMITTED')
  })

  test('STUDENT sees assignment center and switches all five sandbox sub-apps', async ({ page }) => {
    await publishFiveSandboxTask(page)
    await page.goto('/center/assignments?status=AVAILABLE')
    await expect(page.locator('[data-assignment-center]')).toBeVisible()
    await expect(page.locator('[data-assignment-card]').first()).toBeVisible()
    await page.locator('[data-assignment-card]').first().getByRole('link', { name: '查看指导书' }).click()
    await expect(page.locator('[data-assignment-detail]')).toBeVisible()
    await page.locator('[data-start-task]').click()
    await expect(page).toHaveURL(/\/center\/tasks\/[^/]+\/sandbox$/)
    await expect(page.locator('[data-sandbox-page]')).toBeVisible()
    await expect(page.locator('[data-task-guide]')).toBeVisible()
    await expect(page.locator('[data-sandbox-workbench]')).toBeVisible()
    await expect(page.locator('[data-sandbox-tab]')).toHaveCount(5)
    for (const label of ['店铺基础', '商品管理', '店铺装修', '营销活动', '经营分析']) {
      await page.getByRole('button', { name: label, exact: true }).click()
      await expect(page.locator('[data-active-sandbox]')).toContainText(label)
    }
  })

  test('left-guide/right-workbench stays within a 390px viewport', async ({ page }) => {
    const studentTaskId = await publishFiveSandboxTask(page)
    await page.request.post(`/api/center/student-tasks/${studentTaskId}/start`, { headers: await csrfHeaders(page, { 'Idempotency-Key': 'phase-c-mobile-start' }) })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/center/tasks/${studentTaskId}/sandbox`)
    await expect(page.locator('[data-sandbox-page]')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
