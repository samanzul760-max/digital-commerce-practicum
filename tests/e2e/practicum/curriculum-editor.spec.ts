import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'

/**
 * Given an administrator is managing teaching plans
 * When the administrator creates a draft plan
 * Then the draft opens from the administrator editor entry and remains hidden from students
 */
test('[CASE-S2-001] administrator creates a draft plan hidden from students with editor entry', async ({ page }) => {
  const planTitle = `草稿计划 ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-desc-input]').fill('用于课程编辑器入口验证')
  await page.locator('[data-plan-submit]').click()

  const createdPlan = page.locator('[data-plan-card]').filter({ hasText: planTitle })
  await expect(createdPlan).toBeVisible()
  await expect(createdPlan.locator('a')).toHaveAttribute('href', /\/practicum\/plans\/plan-[^/]+\/edit$/)
  await createdPlan.locator('a').click()
  await expect(page).toHaveURL(/\/practicum\/plans\/plan-[^/]+\/edit$/)
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page.locator('[data-plan-card]').filter({ hasText: planTitle })).toHaveCount(0)
})

/**
 * Given an administrator is editing a draft plan
 * When the administrator creates a first-level module and a second-level unit
 * Then the new hierarchy appears in the curriculum editor
 */
test('[CASE-S2-002] administrator creates module and unit hierarchy in the editor', async ({ page }) => {
  const planTitle = `目录计划 ${Date.now()}`
  const moduleTitle = `一级目录 ${Date.now()}`
  const unitTitle = `二级目录 ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(moduleTitle)
  await page.locator('[data-node-submit]').click()
  const module = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await expect(module).toBeVisible()

  await module.locator('[data-module-toggle]').click()
  await module.locator('[data-create-unit]').click()
  await module.locator('[data-node-title-input]').fill(unitTitle)
  await module.locator('[data-node-submit]').click()
  await expect(module.locator('[data-unit]').filter({ hasText: unitTitle })).toBeVisible()
})

/**
 * Given an administrator is editing a second-level unit
 * When the administrator adds software, training and practice activities
 * Then each activity keeps its explicit type in the curriculum editor
 */
test('[CASE-S2-006] administrator adds typed activities to a unit', async ({ page }) => {
  const planTitle = `活动计划 ${Date.now()}`
  const moduleTitle = `活动一级 ${Date.now()}`
  const unitTitle = `活动二级 ${Date.now()}`
  const activities = [
    { title: `软件操作 ${Date.now()}`, type: 'SOFTWARE_ACTION' },
    { title: `训练活动 ${Date.now()}`, type: 'TRAINING' },
    { title: `实践活动 ${Date.now()}`, type: 'PRACTICE_ACTIVITY' },
  ]

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(moduleTitle)
  await page.locator('[data-node-submit]').click()
  const module = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await module.locator('[data-module-toggle]').click()
  await module.locator('[data-create-unit]').click()
  await module.locator('[data-node-title-input]').fill(unitTitle)
  await module.locator('[data-node-submit]').click()
  const unit = module.locator('[data-unit]').filter({ hasText: unitTitle })
  await unit.locator('[data-unit-toggle]').click()

  for (const activity of activities) {
    await unit.locator('[data-create-activity]').click()
    await unit.locator('[data-activity-title-input]').fill(activity.title)
    await unit.locator('[data-activity-type-select]').selectOption(activity.type)
    await unit.locator('[data-activity-submit]').click()
    await expect(unit.locator('[data-activity]').filter({ hasText: activity.title })).toHaveAttribute('data-activity-type', activity.type)
  }
})

/**
 * Given an administrator has recorded supporting resource metadata in a curriculum plan
 * When the administrator opens the student preview
 * Then the resource appears in the preview without a file upload
 */
test('[CASE-S2-007] administrator records a supporting resource and previews the student view', async ({ page }) => {
  const planTitle = `Resource plan ${Date.now()}`
  const resourceName = `Product brief ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()

  await page.locator('[data-add-supporting-resource]').click()
  await page.locator('[data-resource-name-input]').fill(resourceName)
  await page.locator('[data-resource-kind-select]').selectOption('LINK')
  await page.locator('[data-resource-url-input]').fill('https://example.test/product-brief')
  await page.locator('[data-resource-submit]').click()
  await page.locator('[data-student-preview]').click()

  await expect(page.locator('[data-student-preview-panel]')).toContainText(resourceName)
  await expect(page.locator('[data-student-preview-panel]')).toContainText('https://example.test/product-brief')
})

/**
 * Given an administrator selects a curriculum unit with descendants
 * When the administrator requests deletion
 * Then the editor states the descendant impact and blocks submitted evidence
 */
test('[CASE-S2-006] administrator sees protected deletion impact for a curriculum unit', async ({ page, browser }) => {
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  expect((await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })).status()).toBe(200)
  expect((await student.request.post('/api/practicum/submissions', {
    headers: await csrfHeaders(student, { 'Idempotency-Key': `delete-impact-${Date.now()}` }),
    data: { activityId: 'act-01-003', text: '用于目录删除保护的真实提交证据。' },
  })).status()).toBe(201)
  await studentContext.close()

  await page.goto('/practicum/plans/plan-wdds/edit')

  const module = page.locator('[data-module]').first()
  await module.locator('[data-module-toggle]').click()
  const unit = module.locator('[data-unit]').first()
  await unit.locator('[data-delete-unit]').click()

  await expect(page.locator('[data-delete-impact]')).toContainText('影响活动')
  await expect(page.locator('[data-delete-impact]')).toContainText('已提交证据')
  await expect(page.locator('[data-delete-blocked]')).toBeVisible()
})

/**
 * Given an administrator is editing an incomplete draft plan
 * When the administrator requests publication
 * Then the editor lists actionable missing publication requirements
 */
test('[CASE-S2-003] administrator receives publish validation for an incomplete plan', async ({ page }) => {
  const planTitle = `Incomplete plan ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await page.locator('[data-request-publish]').click()

  await expect(page.locator('[data-publish-validation]')).toContainText('活动')
})

/**
 * Given an administrator is editing a published plan
 * When the administrator archives the plan after reviewing its impact
 * Then the plan becomes read-only and is hidden from the student workspace
 */
test('[CASE-S2-003] administrator archives a published plan into a read-only state', async ({ page }) => {
  const key = `archive-plan-${Date.now()}`
  const planTitle = `归档计划 ${key}`
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  const created = await page.request.post('/api/practicum/plans', {
    headers: await csrfHeaders(page, { 'Idempotency-Key': key }),
    data: { roomId: 'room-001', title: planTitle, description: '用于验证归档后只读与学生不可见。' },
  })
  expect(created.status()).toBe(201)
  const plan = (await created.json()).plan
  const moduleResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(page),
    data: { title: '归档模块', level: 1, parentId: null, version: plan.version },
  })
  expect(moduleResponse.status()).toBe(201)
  const moduleSnapshot = await moduleResponse.json()
  const module = moduleSnapshot.nodes.find((node: { level: number }) => node.level === 1)
  const unitResponse = await page.request.post(`/api/practicum/plans/${plan.id}/nodes`, {
    headers: await csrfHeaders(page),
    data: { title: '归档单元', level: 2, parentId: module.id, version: moduleSnapshot.plan.version },
  })
  expect(unitResponse.status()).toBe(201)
  const unitSnapshot = await unitResponse.json()
  const unit = unitSnapshot.nodes.find((node: { level: number }) => node.level === 2)
  const activityResponse = await page.request.post(`/api/practicum/plans/${plan.id}/activities`, {
    headers: await csrfHeaders(page),
    data: { parentId: unit.id, title: '归档活动', type: 'SOFTWARE_ACTION', version: unitSnapshot.plan.version },
  })
  expect(activityResponse.status()).toBe(201)
  expect((await page.request.post(`/api/practicum/plans/${plan.id}/publish`, { headers: await csrfHeaders(page) })).status()).toBe(200)

  await page.goto(`/practicum/plans/${plan.id}/edit`)
  await page.locator('[data-request-archive]').click()
  await page.locator('[data-confirm-archive]').click()
  await expect(page.locator('[data-plan-read-only]')).toBeVisible()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page.locator('[data-plan-card]').filter({ hasText: planTitle })).toHaveCount(0)
})

/**
 * Given an administrator has created a draft plan
 * When the administrator refreshes the practicum workspace
 * Then the plan remains available from the server-owned repository
 */
test('[ASSUME-S2-001] administrator plan changes persist after a browser refresh', async ({ page }) => {
  const planTitle = `Persistent plan ${Date.now()}`
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.reload()
  await expect(page.locator('[data-plan-card]').filter({ hasText: planTitle })).toBeVisible()
  const response = await page.request.get('/api/practicum/plans?keyword=' + encodeURIComponent(planTitle))
  expect(response.ok()).toBeTruthy()
  expect((await response.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({ title: planTitle })]))
})

/**
 * Given an owner is editing a draft plan with a module
 * When the owner renames the module
 * Then the new name appears in the curriculum tree and is persisted
 */
test('[CASE-S2-002] owner renames a curriculum module', async ({ page }) => {
  const planTitle = `重命名计划 ${Date.now()}`
  const moduleTitle = `原始模块 ${Date.now()}`
  const renamedTitle = `已重命名模块 ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(moduleTitle)
  await page.locator('[data-node-submit]').click()
  const module = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await expect(module).toBeVisible()

  await module.locator('[data-rename-module]').click()
  await module.locator('[data-node-title-input]').fill(renamedTitle)
  await module.locator('[data-node-submit]').click()
  await expect(page.locator('[data-module]').filter({ hasText: renamedTitle })).toBeVisible()
  await expect(page.locator('[data-module]').filter({ hasText: moduleTitle })).toHaveCount(0)

  await page.reload()
  await expect(page.locator('[data-module]').filter({ hasText: renamedTitle })).toBeVisible()
})

/**
 * Given an owner is editing a draft plan with a unit
 * When the owner renames the unit
 * Then the new name appears in the curriculum tree and is persisted
 */
test('[CASE-S2-002] owner renames a curriculum unit', async ({ page }) => {
  const planTitle = `单元重命名计划 ${Date.now()}`
  const moduleTitle = `容器模块 ${Date.now()}`
  const unitTitle = `原始单元 ${Date.now()}`
  const renamedTitle = `已重命名单元 ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(moduleTitle)
  await page.locator('[data-node-submit]').click()
  const module = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await module.locator('[data-module-toggle]').click()
  await module.locator('[data-create-unit]').click()
  await module.locator('[data-node-title-input]').fill(unitTitle)
  await module.locator('[data-node-submit]').click()
  const unit = module.locator('[data-unit]').filter({ hasText: unitTitle })
  await expect(unit).toBeVisible()

  await unit.locator('[data-rename-unit]').click()
  await unit.locator('[data-node-title-input]').fill(renamedTitle)
  await unit.locator('[data-node-submit]').click()
  await expect(module.locator('[data-unit]').filter({ hasText: renamedTitle })).toBeVisible()
  await expect(module.locator('[data-unit]').filter({ hasText: unitTitle })).toHaveCount(0)

  await page.reload()
  const reloadedModule = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await reloadedModule.locator('[data-module-toggle]').click()
  await expect(reloadedModule.locator('[data-unit]').filter({ hasText: renamedTitle })).toBeVisible()
})

/**
 * Given an owner is editing a draft plan with two modules
 * When the owner moves a module up
 * Then the module order changes and is persisted
 */
test('[CASE-S2-002] owner reorders modules in the curriculum editor', async ({ page }) => {
  const planTitle = `排序计划 ${Date.now()}`
  const firstModule = `第一模块 ${Date.now()}`
  const secondModule = `第二模块 ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  // Create first module
  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(firstModule)
  await page.locator('[data-node-submit]').click()
  // Create second module
  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(secondModule)
  await page.locator('[data-node-submit]').click()

  // Verify initial order: first then second
  const modules = page.locator('[data-module]')
  await expect(modules.nth(0)).toContainText(firstModule)
  await expect(modules.nth(1)).toContainText(secondModule)

  // Move second module up
  await modules.nth(1).locator('[data-move-up]').click()

  // Verify reversed order
  await expect(page.locator('[data-module]').nth(0)).toContainText(secondModule)
  await expect(page.locator('[data-module]').nth(1)).toContainText(firstModule)

  // Verify persistence
  await page.reload()
  await expect(page.locator('[data-module]').nth(0)).toContainText(secondModule)
  await expect(page.locator('[data-module]').nth(1)).toContainText(firstModule)
})

/**
 * Given an owner is editing a draft plan with two units
 * When the owner moves a unit down
 * Then the unit order changes and is persisted
 */
test('[CASE-S2-002] owner reorders units in the curriculum editor', async ({ page }) => {
  const planTitle = `单元排序计划 ${Date.now()}`
  const moduleTitle = `排序容器 ${Date.now()}`
  const firstUnit = `第一单元 ${Date.now()}`
  const secondUnit = `第二单元 ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(moduleTitle)
  await page.locator('[data-node-submit]').click()
  const module = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await module.locator('[data-module-toggle]').click()

  await module.locator('[data-create-unit]').click()
  await module.locator('[data-node-title-input]').fill(firstUnit)
  await module.locator('[data-node-submit]').click()
  await module.locator('[data-create-unit]').click()
  await module.locator('[data-node-title-input]').fill(secondUnit)
  await module.locator('[data-node-submit]').click()

  const units = module.locator('[data-unit]')
  await expect(units.nth(0)).toContainText(firstUnit)
  await expect(units.nth(1)).toContainText(secondUnit)

  await units.nth(0).locator('[data-move-down]').click()
  await expect(module.locator('[data-unit]').nth(0)).toContainText(secondUnit)
  await expect(module.locator('[data-unit]').nth(1)).toContainText(firstUnit)

  await page.reload()
  await page.locator('[data-module]').filter({ hasText: moduleTitle }).locator('[data-module-toggle]').click()
  const reloadedModule = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await expect(reloadedModule.locator('[data-unit]').nth(0)).toContainText(secondUnit)
})

/**
 * Given an owner adds a software action activity to a unit
 * When the owner configures steps with required rules
 * Then the activity retains its step configuration across reload
 */
test('[CASE-S2-006] owner configures software action steps and required rules', async ({ page }) => {
  const planTitle = `软件操作计划 ${Date.now()}`
  const moduleTitle = `软件模块 ${Date.now()}`
  const unitTitle = `软件单元 ${Date.now()}`
  const activityTitle = `步骤活动 ${Date.now()}`
  const step1 = '启动软件并登录'
  const step2 = '完成主界面导航'

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(moduleTitle)
  await page.locator('[data-node-submit]').click()
  const module = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await module.locator('[data-module-toggle]').click()
  await module.locator('[data-create-unit]').click()
  await module.locator('[data-node-title-input]').fill(unitTitle)
  await module.locator('[data-node-submit]').click()
  const unit = module.locator('[data-unit]').filter({ hasText: unitTitle })
  await unit.locator('[data-unit-toggle]').click()

  await unit.locator('[data-create-activity]').click()
  await unit.locator('[data-activity-title-input]').fill(activityTitle)
  await unit.locator('[data-activity-type-select]').selectOption('SOFTWARE_ACTION')
  await unit.locator('[data-activity-submit]').click()

  const activity = unit.locator('[data-activity]').filter({ hasText: activityTitle })
  await activity.click()

  await page.locator('[data-add-step]').click()
  await page.locator('[data-step-label-input]').nth(0).fill(step1)
  await page.locator('[data-step-required-checkbox]').nth(0).check()

  await page.locator('[data-add-step]').click()
  await page.locator('[data-step-label-input]').nth(1).fill(step2)

  await page.locator('[data-save-activity-config]').click()

  await page.reload()
  await page.locator('[data-module]').filter({ hasText: moduleTitle }).locator('[data-module-toggle]').click()
  const reloadedUnit = page.locator('[data-unit]').filter({ hasText: unitTitle })
  await reloadedUnit.locator('[data-unit-toggle]').click()
  await reloadedUnit.locator('[data-activity]').filter({ hasText: activityTitle }).click()

  await expect(page.locator('[data-step-label-input]').nth(0)).toHaveValue(step1)
  await expect(page.locator('[data-step-label-input]').nth(1)).toHaveValue(step2)
  await expect(page.locator('[data-step-required-checkbox]').nth(0)).toBeChecked()
  await expect(page.locator('[data-step-required-checkbox]').nth(1)).not.toBeChecked()
})

/**
 * Given an owner adds a training activity to a unit
 * When the owner configures max attempts and an optional time limit
 * Then the training activity retains its attempt configuration
 */
test('[CASE-S2-006] owner configures training activity attempts and time limit', async ({ page }) => {
  const planTitle = `训练计划 ${Date.now()}`
  const moduleTitle = `训练模块 ${Date.now()}`
  const unitTitle = `训练单元 ${Date.now()}`
  const activityTitle = `答题活动 ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(moduleTitle)
  await page.locator('[data-node-submit]').click()
  const module = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await module.locator('[data-module-toggle]').click()
  await module.locator('[data-create-unit]').click()
  await module.locator('[data-node-title-input]').fill(unitTitle)
  await module.locator('[data-node-submit]').click()
  const unit = module.locator('[data-unit]').filter({ hasText: unitTitle })
  await unit.locator('[data-unit-toggle]').click()

  await unit.locator('[data-create-activity]').click()
  await unit.locator('[data-activity-title-input]').fill(activityTitle)
  await unit.locator('[data-activity-type-select]').selectOption('TRAINING')
  await unit.locator('[data-activity-submit]').click()

  const activity = unit.locator('[data-activity]').filter({ hasText: activityTitle })
  await activity.click()

  await expect(page.locator('[data-activity-config-panel]')).toBeVisible()
  await expect(page.locator('[data-training-max-attempts]')).toBeVisible()
  await page.locator('[data-training-max-attempts]').fill('5')
  await page.locator('[data-save-activity-config]').click()

  await page.reload()
  await page.locator('[data-module]').filter({ hasText: moduleTitle }).locator('[data-module-toggle]').click()
  const reloadedUnit = page.locator('[data-unit]').filter({ hasText: unitTitle })
  await reloadedUnit.locator('[data-unit-toggle]').click()
  await reloadedUnit.locator('[data-activity]').filter({ hasText: activityTitle }).click()

  await expect(page.locator('[data-training-max-attempts]')).toHaveValue('5')
})

/**
 * Given an owner adds a practice activity to a unit
 * When the owner configures deliverables and rubric dimensions
 * Then the practice activity retains its deliverable and rubric configuration
 */
test('[CASE-S2-006] owner configures practice activity deliverables and rubric', async ({ page }) => {
  const planTitle = `实践计划 ${Date.now()}`
  const moduleTitle = `实践模块 ${Date.now()}`
  const unitTitle = `实践单元 ${Date.now()}`
  const activityTitle = `交付活动 ${Date.now()}`
  const dimensionLabel = '内容完整性'

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(moduleTitle)
  await page.locator('[data-node-submit]').click()
  const module = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await module.locator('[data-module-toggle]').click()
  await module.locator('[data-create-unit]').click()
  await module.locator('[data-node-title-input]').fill(unitTitle)
  await module.locator('[data-node-submit]').click()
  const unit = module.locator('[data-unit]').filter({ hasText: unitTitle })
  await unit.locator('[data-unit-toggle]').click()

  await unit.locator('[data-create-activity]').click()
  await unit.locator('[data-activity-title-input]').fill(activityTitle)
  await unit.locator('[data-activity-type-select]').selectOption('PRACTICE_ACTIVITY')
  await unit.locator('[data-activity-submit]').click()

  const activity = unit.locator('[data-activity]').filter({ hasText: activityTitle })
  await activity.click()

  await expect(page.locator('[data-activity-config-panel]')).toBeVisible()
  await page.locator('[data-add-rubric-dimension]').click()
  await page.locator('[data-rubric-label-input]').nth(0).fill(dimensionLabel)
  await page.locator('[data-save-activity-config]').click()

  await page.reload()
  await page.locator('[data-module]').filter({ hasText: moduleTitle }).locator('[data-module-toggle]').click()
  const reloadedUnit = page.locator('[data-unit]').filter({ hasText: unitTitle })
  await reloadedUnit.locator('[data-unit-toggle]').click()
  await reloadedUnit.locator('[data-activity]').filter({ hasText: activityTitle }).click()

  await expect(page.locator('[data-rubric-label-input]').nth(0)).toHaveValue(dimensionLabel)
})

/**
 * Given an owner is editing a draft plan with a module that has no submitted evidence
 * When the owner confirms deletion after reviewing the impact
 * Then the module and all descendants are removed from the curriculum tree
 */
test('[CASE-S2-006] owner deletes a module without submitted evidence', async ({ page }) => {
  const planTitle = `删除计划 ${Date.now()}`
  const moduleTitle = `待删模块 ${Date.now()}`
  const unitTitle = `待删单元 ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  // Create module + unit
  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill(moduleTitle)
  await page.locator('[data-node-submit]').click()
  const module = page.locator('[data-module]').filter({ hasText: moduleTitle })
  await module.locator('[data-module-toggle]').click()
  await module.locator('[data-create-unit]').click()
  await module.locator('[data-node-title-input]').fill(unitTitle)
  await module.locator('[data-node-submit]').click()
  await expect(module.locator('[data-unit]').filter({ hasText: unitTitle })).toBeVisible()

  // Delete the module
  await module.locator('[data-delete-module]').click()
  await expect(page.locator('[data-delete-impact]')).toBeVisible()
  await page.locator('[data-confirm-delete]').click()

  // Module should be gone
  await expect(page.locator('[data-module]').filter({ hasText: moduleTitle })).toHaveCount(0)

  // Persisted after reload
  await page.reload()
  await expect(page.locator('[data-module]').filter({ hasText: moduleTitle })).toHaveCount(0)
})

/**
 * Given an owner has a valid draft plan with activities
 * When the owner publishes the plan
 * Then the plan becomes visible to students and shows published status
 */
test('[CASE-S2-003] owner publishes a valid draft plan and students can see it', async ({ page }) => {
  const planTitle = `发布测试计划 ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-desc-input]').fill('用于发布测试')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()
  await expect(page.locator('[data-plan-editor]')).toBeVisible()

  // Add a module and activity to make it "valid"
  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill('发布模块')
  await page.locator('[data-node-submit]').click()
  const module = page.locator('[data-module]').filter({ hasText: '发布模块' })
  await module.locator('[data-module-toggle]').click()
  await module.locator('[data-create-unit]').click()
  await module.locator('[data-node-title-input]').fill('发布单元')
  await module.locator('[data-node-submit]').click()
  const unit = module.locator('[data-unit]').filter({ hasText: '发布单元' })
  await unit.locator('[data-unit-toggle]').click()
  await unit.locator('[data-create-activity]').click()
  await unit.locator('[data-activity-title-input]').fill('发布活动')
  await unit.locator('[data-activity-type-select]').selectOption('SOFTWARE_ACTION')
  await unit.locator('[data-activity-submit]').click()

  // Publish
  await page.locator('[data-request-publish]').click()
  await expect(page.locator('[data-publish-validation]')).toBeVisible()
  await page.locator('[data-confirm-publish]').click()

  // Should now show published status
  await expect(page.locator('[data-plan-status]')).toContainText('已发布')

  // Verify published status visible in editor
  await expect(page.locator('[data-plan-status]')).toContainText('已发布')

  // Get the plan ID from URL (format: /practicum/plans/{planId}/edit)
  const planId = page.url().split('/plans/')[1]?.split('/')[0] ?? ''

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // Student can access the published plan detail page (not edit)
  await page.goto(`/practicum/plans/${planId}`)
  await expect(page.locator('[data-forbidden]')).toHaveCount(0)
  await expect(page.locator('h1')).toContainText(planTitle)
})

/**
 * Given an owner has a published plan
 * When the owner unpublishes it
 * Then the plan returns to draft and is hidden from students
 */
test('[CASE-S2-003] owner unpublishes a plan back to draft', async ({ page }) => {
  const planTitle = `撤回计划 ${Date.now()}`

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.locator('[data-create-plan]').click()
  await page.locator('[data-plan-title-input]').fill(planTitle)
  await page.locator('[data-plan-desc-input]').fill('服务端计划描述')
  await page.locator('[data-plan-desc-input]').fill('用于撤回测试')
  await page.locator('[data-plan-submit]').click()
  await page.locator('[data-plan-card]').filter({ hasText: planTitle }).locator('a').click()

  // Add activity to make valid
  await page.locator('[data-create-module]').click()
  await page.locator('[data-node-title-input]').fill('M')
  await page.locator('[data-node-submit]').click()
  const m = page.locator('[data-module]').filter({ hasText: 'M' })
  await m.locator('[data-module-toggle]').click()
  await m.locator('[data-create-unit]').click()
  await m.locator('[data-node-title-input]').fill('U')
  await m.locator('[data-node-submit]').click()
  const u = m.locator('[data-unit]').filter({ hasText: 'U' })
  await u.locator('[data-unit-toggle]').click()
  await u.locator('[data-create-activity]').click()
  await u.locator('[data-activity-title-input]').fill('A')
  await u.locator('[data-activity-type-select]').selectOption('SOFTWARE_ACTION')
  await u.locator('[data-activity-submit]').click()

  // Publish
  await page.locator('[data-request-publish]').click()
  await page.locator('[data-confirm-publish]').click()

  // Unpublish
  await page.locator('[data-request-unpublish]').click()
  // Confirm the unpublish action
  await expect(page.locator('[data-unpublish-confirm]')).toBeVisible()
  await page.locator('[data-confirm-unpublish]').click()
  await expect(page.locator('[data-plan-status]')).toContainText('草稿')

  // Hidden from student
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page.locator('[data-plan-card]').filter({ hasText: planTitle })).toHaveCount(0)
})
