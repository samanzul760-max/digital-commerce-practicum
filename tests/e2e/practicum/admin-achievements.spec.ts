import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'
import { loginAsOwner, loginAsStudent } from './auth-helpers'

async function selectWorkspaceRole(page: import('@playwright/test').Page, role: 'OWNER' | 'STUDENT') {
  if (role === 'OWNER') await loginAsOwner(page)
  else await loginAsStudent(page)
  await page.goto('/practicum/profile')
  await page.locator(`[data-role-option="${role}"]`).click()
  await expect(page).toHaveURL('/practicum')
}

test('owner member achievement analytics includes server-derived summary and six dimensions', async ({ page }) => {
  await loginAsOwner(page)

  const response = await page.request.get('/api/practicum/analytics/members?roomId=room-001')

  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body).toEqual(expect.objectContaining({
    summary: expect.objectContaining({
      learnerCount: expect.any(Number),
      averageCompletionPercent: expect.any(Number),
      completedTaskCount: expect.any(Number),
      pendingReviewCount: expect.any(Number),
    }),
    items: expect.any(Array),
    skillDimensions: expect.arrayContaining([
      expect.objectContaining({ skill: expect.any(String), score: expect.any(Number) }),
    ]),
  }))
  expect(body.skillDimensions).toHaveLength(6)
  expect(new Set(body.skillDimensions.map((dimension: { skill: string }) => dimension.skill)).size).toBe(6)
})

test('owner receives the same database-backed groups and students from members and analytics APIs', async ({ page }) => {
  await loginAsOwner(page)

  const membersResponse = await page.request.get('/api/practicum/members?roomId=room-001&pageSize=50')
  expect(membersResponse.status()).toBe(200)
  const membersBody = await membersResponse.json()
  expect(membersBody.items).toHaveLength(20)
  expect(membersBody.groups).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: '运营一组', memberCount: 10 }),
    expect.objectContaining({ name: '数据二组', memberCount: 10 }),
  ]))

  const response = await page.request.get('/api/practicum/analytics/members?roomId=room-001')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.groups).toEqual(expect.arrayContaining([
    expect.objectContaining({ groupLabel: '运营一组', learnerCount: 10 }),
    expect.objectContaining({ groupLabel: '数据二组', learnerCount: 10 }),
  ]))

  expect(body.items.map((item: { memberId: string }) => item.memberId).sort()).toEqual(
    membersBody.items.map((item: { id: string }) => item.id).sort(),
  )
  const demoMembers = body.items.filter((item: { isDemo?: boolean }) => item.isDemo)
  expect(demoMembers).toHaveLength(20)
  for (const groupLabel of ['运营一组', '数据二组']) {
    const groupMembers = demoMembers.filter((item: { groupLabel?: string }) => item.groupLabel === groupLabel)
    expect(groupMembers).toHaveLength(10)
    expect(groupMembers).toEqual(expect.arrayContaining([
      expect.objectContaining({ completionPercent: expect.any(Number), gradedCount: expect.any(Number), avgScore: expect.any(Number) }),
    ]))
  }
})

test('changing a database member group is reflected by achievement analytics', async ({ page }) => {
  await loginAsOwner(page)
  const listed = await page.request.get('/api/practicum/members?roomId=room-001&pageSize=50')
  const membersBody = await listed.json()
  const member = membersBody.items[0] as { id: string; group: string }
  const temporaryGroup = `同步验证组-${Date.now()}`

  try {
    const updated = await page.request.patch(`/api/practicum/members/${member.id}`, {
      headers: await csrfHeaders(page),
      data: { roomId: 'room-001', group: temporaryGroup },
    })
    expect(updated.status()).toBe(200)

    const analytics = await page.request.get('/api/practicum/analytics/members?roomId=room-001')
    const analyticsBody = await analytics.json()
    expect(analyticsBody.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ memberId: member.id, groupLabel: temporaryGroup }),
    ]))
    expect(analyticsBody.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ groupLabel: temporaryGroup, learnerCount: 1 }),
    ]))
  } finally {
    await page.request.patch(`/api/practicum/members/${member.id}`, {
      headers: await csrfHeaders(page),
      data: { roomId: 'room-001', group: member.group },
    })
  }
})

test('owner sees all demo students and opens one student completion distribution', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  await page.goto('/practicum/achievements')

  await expect(page.locator('[data-achievement-group]')).toHaveCount(2)
  await expect(page.locator('[data-demo-achievement-member]')).toHaveCount(20)
  await page.locator('[data-demo-achievement-member] [data-achievement-member-link]').first().click()
  await expect(page.locator('[data-member-data-page]')).toBeVisible()
  await expect(page.locator('[data-member-group]')).toBeVisible()
  await expect(page.locator('[data-member-plan-row]')).not.toHaveCount(0)
  await expect(page.locator('[data-member-skill-row]')).toHaveCount(6)
})

test('owner achievement analytics maps graded rubrics into stable capability axes', async ({ browser, page }) => {
  await loginAsOwner(page)
  const key = `admin-achievement-${Date.now()}`
  const rubricLabel = `运营判断 ${key}`
  const planResponse = await page.request.post('/api/practicum/plans', {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-plan` }),
    data: { roomId: 'room-001', title: `Achievement analytics ${key}`, description: 'Server-backed achievement fixture.' },
  })
  expect(planResponse.status()).toBe(201)
  const plan = (await planResponse.json()).plan

  const moduleResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(page),
    data: { title: 'Achievement module', level: 1, parentId: null, version: plan.version },
  })
  expect(moduleResponse.status()).toBe(201)
  const moduleSnapshot = await moduleResponse.json()
  const module = moduleSnapshot.nodes.find((node: { level: number }) => node.level === 1)

  const unitResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(page),
    data: { title: 'Achievement unit', level: 2, parentId: module.id, version: moduleSnapshot.plan.version },
  })
  expect(unitResponse.status()).toBe(201)
  const unitSnapshot = await unitResponse.json()
  const unit = unitSnapshot.nodes.find((node: { level: number }) => node.level === 2)

  const activityResponse = await page.request.post(`/api/practicum/plans/${plan.id}/activities`, {
    headers: await csrfHeaders(page, { 'Idempotency-Key': `${key}-activity` }),
    data: { parentId: unit.id, title: 'Achievement practice', type: 'PRACTICE_ACTIVITY', version: unitSnapshot.plan.version },
  })
  expect(activityResponse.status()).toBe(201)
  const activitySnapshot = await activityResponse.json()
  const activityNode = activitySnapshot.nodes.find((node: { title: string }) => node.title === 'Achievement practice')

  const configured = await page.request.patch(`/api/practicum/plans/${plan.id}/activities/${activityNode.activityId}`, {
    headers: await csrfHeaders(page),
    data: {
      version: activitySnapshot.plan.version,
      config: {
        type: 'PRACTICE_ACTIVITY',
        deliverables: ['Achievement evidence'],
        rubric: [{ id: 'achievement-rubric', label: rubricLabel, maxScore: 100, required: true }],
      },
    },
  })
  expect(configured.status()).toBe(200)

  const published = await page.request.post(`/api/practicum/plans/${plan.id}/publish`, { headers: await csrfHeaders(page) })
  expect(published.status()).toBe(200)

  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  await loginAsStudent(student)
  const submitted = await student.request.post('/api/practicum/submissions', {
    headers: await csrfHeaders(student, { 'Idempotency-Key': `${key}-submission` }),
    data: { activityId: activityNode.id, text: 'Achievement rubric evidence.' },
  })
  expect(submitted.status()).toBe(201)
  await studentContext.close()

  const graded = await page.request.post(`/api/practicum/submissions/${activityNode.id}/grade`, {
    headers: await csrfHeaders(page),
    data: { rubricScores: { 'achievement-rubric': 100 }, feedback: 'Aggregated into the class achievement view.' },
  })
  expect(graded.status()).toBe(200)

  const response = await page.request.get('/api/practicum/analytics/members?roomId=room-001')
  expect(response.status()).toBe(200)
  const analytics = await response.json()
  expect(analytics.skillDimensions.map((dimension: { skill: string }) => dimension.skill)).toEqual([
    '商品运营', '数据分析', '内容策划', '视觉呈现', '营销投放', '客户服务',
  ])
  expect(analytics.skillDimensions).toEqual(expect.arrayContaining([
    expect.objectContaining({ skill: '商品运营', score: expect.any(Number) }),
  ]))
  expect(analytics.skillDimensions.some((dimension: { skill: string }) => dimension.skill.includes('admin-achievement'))).toBe(false)
})

test('owner sees class achievement observability instead of the student-only prompt', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  await page.goto('/practicum/achievements')

  await expect(page.locator('[data-admin-achievements-page]')).toBeVisible()
  await expect(page.locator('[data-achievement-radar]')).toBeVisible()
  await expect(page.locator('[data-achievement-ranking]')).toBeVisible()
  await expect(page.locator('[data-achievement-member-list]')).toBeVisible()
  await expect(page.getByText('成就仅向学生视图开放')).toHaveCount(0)
})

test('owner opens the selected student completion detail from the achievement ranking', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  await page.goto('/practicum/achievements')

  await page.locator('[data-achievement-member-link]').first().click()
  await expect(page).toHaveURL(/\/practicum\/member-data\//)
  await expect(page.locator('[data-member-data-page]')).toBeVisible()
})

test('student keeps the private achievement view', async ({ page }) => {
  await selectWorkspaceRole(page, 'STUDENT')
  await page.goto('/practicum/achievements')

  await expect(page.locator('[data-achievements-page]')).toBeVisible()
  await expect(page.locator('[data-admin-achievements-page]')).toHaveCount(0)
})

test('owner sees an error state rather than local achievement data when analytics fails', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  await page.route('**/api/practicum/analytics/members*', route => route.fulfill({ status: 500, body: '{}' }))
  await page.goto('/practicum/achievements')

  await expect(page.locator('[data-admin-achievements-error]')).toBeVisible()
  await expect(page.locator('[data-achievement-member-list]')).toHaveCount(0)
})

test('owner achievement observability fits a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await selectWorkspaceRole(page, 'OWNER')
  await page.goto('/practicum/achievements')

  await expect(page.locator('[data-admin-achievements-page]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('radar chart truncates long database dimension names and exposes the full name as a tooltip', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  const longLabel = '运营判断-admin-achievement-1785667147966'
  await page.route('**/api/practicum/analytics/members*', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.skillDimensions = Array.from({ length: 6 }, (_, index) => ({
      skill: `${longLabel}-${index + 1}`,
      score: 70 + index,
    }))
    await route.fulfill({ response, json: body })
  })
  await page.goto('/practicum/achievements')

  const labels = page.locator('[data-radar-label]')
  await expect(labels).toHaveCount(6)
  for (const label of await labels.all()) {
    expect((await label.locator('text').textContent())?.length).toBeLessThanOrEqual(9)
  }
  await expect(labels.first().locator('title')).toHaveText(`${longLabel}-1`)
})
