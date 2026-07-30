import { expect, test } from '@playwright/test'
import { csrfHeaders } from './csrf'

/**
 * Given a Student has submitted a practice activity for review
 * When the Owner opens the assigned review queue
 * Then the queue shows the Student plan unit activity version time and status
 */
test('[ASSUME-S4-001] owner sees complete submission fields in the review queue', async ({ browser }) => {
  const studentContext = await browser.newContext()
  const student = await studentContext.newPage()
  expect((await student.request.post('/api/auth/login', { data: { identifier: 'student@example.test', password: 'StudentPass123!' } })).status()).toBe(200)
  expect((await student.request.post('/api/practicum/submissions', {
    headers: await csrfHeaders(student, { 'Idempotency-Key': `review-queue-${Date.now()}` }),
    data: { activityId: 'act-01-003', text: '版本一：完成店铺基本设置并记录关键参数。' },
  })).status()).toBe(201)

  const ownerContext = await browser.newContext()
  const page = await ownerContext.newPage()
  expect((await page.request.post('/api/auth/login', { data: { identifier: 'owner@example.test', password: 'OwnerPass123!' } })).status()).toBe(200)
  await page.goto('/practicum/reviews')

  const row = page.locator('[data-review-row]').filter({ hasText: '店铺基本设置' })
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('实训学生')
  await expect(row).toContainText('网店运营')
  await expect(row).toContainText('网店开设')
  await expect(row).toContainText('店铺基本设置')
  await expect(row).toContainText('版本 1')
  await expect(row.locator('[data-submitted-time]')).not.toBeEmpty()
  await expect(row.locator('[data-review-status]')).toHaveText('待审核')
  await ownerContext.close()
  await studentContext.close()
})

/**
 * Given an Owner has submissions from different plans units statuses and Students
 * When the Owner configures the queue filters and submission-time ordering
 * Then only matching submissions appear in the selected oldest or newest order
 */
test('[ASSUME-S4-001] owner filters and sorts the review queue', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('用于队列筛选的网店运营提交。')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  await page.evaluate(() => {
    const key = 'digital-commerce-practicum.v1'
    const record = JSON.parse(localStorage.getItem(key) ?? '{}')
    record.nodes.push(
      { id: 'unit-review-02', planId: 'plan-wdsj', parentId: null, level: 2, title: '视觉规范', description: '', sort: 1 },
      { id: 'act-review-02', planId: 'plan-wdsj', parentId: 'unit-review-02', level: 3, title: '店铺主图规范', description: '', sort: 1 },
    )
    record.practiceSubmissions['act-review-02'] = {
      status: 'RETURNED',
      studentId: 'student-002',
      studentLabel: '学生 002',
      feedback: '请补充主图尺寸说明。',
      versions: [{
        id: 'submission-act-review-02-1',
        submissionId: 'act-review-02',
        version: 1,
        text: '视觉规范初稿',
        links: [],
        attachments: [],
        submittedAt: '2026-07-01T08:00:00.000Z',
      }],
    }
    localStorage.setItem(key, JSON.stringify(record))
  })

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/reviews')

  await page.locator('[data-plan-filter]').selectOption('plan-wdsj')
  await page.locator('[data-unit-filter]').selectOption('unit-review-02')
  await page.locator('[data-status-filter]').selectOption('RETURNED')
  await page.locator('[data-student-filter]').fill('学生 002')
  await expect(page.locator('[data-review-row]')).toHaveCount(1)
  await expect(page.locator('[data-review-row]')).toContainText('店铺主图规范')

  await page.locator('[data-plan-filter]').selectOption('')
  await page.locator('[data-unit-filter]').selectOption('')
  await page.locator('[data-status-filter]').selectOption('')
  await page.locator('[data-student-filter]').fill('')
  await page.locator('[data-sort-order]').selectOption('newest')
  await expect(page.locator('[data-review-row]').first()).toContainText('店铺基本设置')
  await page.locator('[data-sort-order]').selectOption('oldest')
  await expect(page.locator('[data-review-row]').first()).toContainText('店铺主图规范')
})

/**
 * Given an Owner is reviewing a submitted practice version
 * When the Owner confirms a return-for-revision request
 * Then non-empty feedback is required and the submission becomes RETURNED
 */
test('[ASSUME-S4-001] owner return requires feedback and persists RETURNED', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('需要 OWNER 审核的店铺设置成果。')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/submissions/act-01-003')
  await expect(page.locator('[data-submission-detail]')).toBeVisible()
  await expect(page.locator('[data-version-history]')).toContainText('版本 1')

  await page.locator('[data-return-action]').click()
  await expect(page.locator('[data-return-feedback-error]')).toHaveText('请输入退回反馈。')
  await page.locator('[data-return-feedback]').fill('请补充设置参数截图，并说明关键配置。')
  await page.locator('[data-return-action]').click()
  const confirmation = page.locator('[data-return-confirmation]')
  await expect(confirmation).toContainText('学生 001')
  await expect(confirmation).toContainText('店铺基本设置')
  await expect(confirmation).toContainText('版本 1')
  await confirmation.locator('[data-confirm-return]').click()

  await expect(page.locator('[data-detail-status]')).toHaveText('已退回')
  await expect(page.locator('[data-feedback-history]')).toContainText('请补充设置参数截图，并说明关键配置。')
  await page.reload()
  await expect(page.locator('[data-detail-status]')).toHaveText('已退回')
  const submission = await page.evaluate(() => JSON.parse(localStorage.getItem('digital-commerce-practicum.v1') ?? '{}').practiceSubmissions['act-01-003'])
  expect(submission.status).toBe('RETURNED')
  expect(submission.feedbackEntries).toHaveLength(1)
  expect(submission.feedbackEntries[0].text).toBe('请补充设置参数截图，并说明关键配置。')
})

/**
 * Given a Student practice submission is returned with version feedback
 * When the Student submits a revision
 * Then the returned version feedback and new version remain visible after reload
 */
test('[ASSUME-S4-001] student revision preserves returned evidence', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('版本一：记录店铺设置参数。')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/submissions/act-01-003')
  await page.locator('[data-return-feedback]').fill('请补充参数截图说明。')
  await page.locator('[data-return-action]').click()
  await page.locator('[data-confirm-return]').click()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await expect(page.locator('[data-submission-status]')).toHaveText('已退回')
  await expect(page.locator('[data-returned-feedback]')).toContainText('请补充参数截图说明。')
  await page.locator('[data-practice-draft]').fill('版本二：补充参数截图说明和配置依据。')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  await expect(page.locator('[data-submission-status]')).toHaveText('已提交')
  await expect(page.locator('[data-submission-version]')).toHaveCount(2)
  await expect(page.locator('[data-submission-version]').nth(0)).toContainText('版本一：记录店铺设置参数。')
  await expect(page.locator('[data-submission-version]').nth(1)).toContainText('版本二：补充参数截图说明和配置依据。')
  await expect(page.locator('[data-returned-feedback]')).toContainText('请补充参数截图说明。')

  await page.reload()
  await expect(page.locator('[data-submission-version]')).toHaveCount(2)
  const submission = await page.evaluate(() => JSON.parse(localStorage.getItem('digital-commerce-practicum.v1') ?? '{}').practiceSubmissions['act-01-003'])
  expect(submission.status).toBe('SUBMITTED')
  expect(submission.versions.map((version: { version: number }) => version.version)).toEqual([1, 2])
  expect(submission.versions[0].text).toBe('版本一：记录店铺设置参数。')
  expect(submission.feedbackEntries[0].version).toBe(1)
  expect(submission.feedbackEntries[0].text).toBe('请补充参数截图说明。')
})

/**
 * Given an Owner reviews a submission with required rubric dimensions
 * When the Owner attempts final grading with a required dimension missing
 * Then grading is blocked and the missing dimension is identified
 */
test('[ASSUME-S4-001] owner cannot grade an incomplete required rubric', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('用于量规审核的店铺设置成果。')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/submissions/act-01-003')
  await page.getByLabel('设置完整性（满分 40）').fill('35')
  await page.getByLabel('评分反馈').fill('整体设置正确。')
  await page.locator('[data-finalize-grade]').click()

  await expect(page.locator('[data-grade-error]')).toContainText('请完成必评项：操作规范性')
  await expect(page.locator('[data-grade-confirmation]')).toHaveCount(0)
  const submission = await page.evaluate(() => JSON.parse(localStorage.getItem('digital-commerce-practicum.v1') ?? '{}').practiceSubmissions['act-01-003'])
  expect(submission.status).toBe('SUBMITTED')
  expect(submission.grade).toBeUndefined()
})

/**
 * Given an Owner completed every required rubric dimension
 * When the Owner confirms the final review
 * Then the grade records reviewer time rubric values feedback and GRADED status
 */
test('[ASSUME-S4-001] owner final grade persists immutable review evidence', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('用于最终评分的店铺设置成果。')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/submissions/act-01-003')
  await page.getByLabel('设置完整性（满分 40）').fill('35')
  await page.getByLabel('操作规范性（满分 30）').fill('26')
  await page.getByLabel('文档清晰度（满分 30）').fill('27')
  await page.getByLabel('评分反馈').fill('设置完整，操作过程清楚。')
  await page.locator('[data-finalize-grade]').click()

  const confirmation = page.locator('[data-grade-confirmation]')
  await expect(confirmation).toContainText('设置完整性：35 / 40')
  await expect(confirmation).toContainText('操作规范性：26 / 30')
  await expect(confirmation).toContainText('文档清晰度：27 / 30')
  await expect(confirmation).toContainText('总分：88')
  await expect(confirmation).toContainText('审核者：OWNER')
  await confirmation.locator('[data-confirm-grade]').click()

  await expect(page.locator('[data-detail-status]')).toHaveText('已评分')
  await expect(page.locator('[data-grade-summary]')).toContainText('设置完整，操作过程清楚。')
  await expect(page.locator('[data-grade-reviewer]')).toHaveText('OWNER')
  await expect(page.locator('[data-grade-time]')).not.toBeEmpty()
  await expect(page.locator('[data-finalize-grade]')).toHaveCount(0)

  await page.reload()
  await expect(page.locator('[data-detail-status]')).toHaveText('已评分')
  const submission = await page.evaluate(() => JSON.parse(localStorage.getItem('digital-commerce-practicum.v1') ?? '{}').practiceSubmissions['act-01-003'])
  expect(submission.status).toBe('GRADED')
  expect(submission.grade.reviewerId).toBe('owner-001')
  expect(submission.grade.rubricScores).toEqual({ 'rubric-1': 35, 'rubric-2': 26, 'rubric-3': 27 })
  expect(submission.grade.feedback).toBe('设置完整，操作过程清楚。')
  expect(Number.isNaN(Date.parse(submission.grade.createdAt))).toBe(false)
})

/**
 * Given a Student knows direct OWNER review URLs
 * When the Student opens the protected review surfaces
 * Then access is forbidden without review data controls or extra identities
 */
test('[ASSUME-S4-001] student cannot cross the two-role review boundary', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('不应在审核页面泄露的学生成果。')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  await page.goto('/practicum/reviews')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-review-queue]')).toHaveCount(0)
  await expect(page.locator('[data-review-row]')).toHaveCount(0)
  await expect(page.getByText('不应在审核页面泄露的学生成果。')).toHaveCount(0)

  await page.goto('/practicum/submissions/act-01-003')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-submission-detail]')).toHaveCount(0)
  await expect(page.locator('[data-return-action]')).toHaveCount(0)
  await expect(page.locator('[data-finalize-grade]')).toHaveCount(0)
  await expect(page.getByText('不应在审核页面泄露的学生成果。')).toHaveCount(0)

  await page.goto('/practicum/profile')
  await expect(page.locator('[data-role-option]')).toHaveCount(2)
  const identityText = await page.getByRole('main').innerText()
  expect(identityText).not.toMatch(/TEACHER|MENTOR|教师|导师/i)
  const submission = await page.evaluate(() => JSON.parse(localStorage.getItem('digital-commerce-practicum.v1') ?? '{}').practiceSubmissions['act-01-003'])
  expect(submission.status).toBe('SUBMITTED')
})

/**
 * Given an Owner configured review queue filters
 * When the Owner switches review scope and processing state
 * Then the matching queue changes without losing the configured filters
 */
test('[ASSUME-S4-001] owner switches review views without losing filters', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('计划审核待处理成果。')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  await page.evaluate(() => {
    const key = 'digital-commerce-practicum.v1'
    const record = JSON.parse(localStorage.getItem(key) ?? '{}')
    record.nodes.push({ id: 'act-classroom-review', planId: 'plan-wdds', parentId: 'unit-01-01', level: 3, title: '课堂运营记录', description: '', sort: 99 })
    record.practiceSubmissions['act-classroom-review'] = {
      status: 'RETURNED',
      reviewScope: 'CLASSROOM',
      studentId: 'student-002',
      studentLabel: '学生 002',
      versions: [{
        id: 'submission-act-classroom-review-1',
        submissionId: 'act-classroom-review',
        version: 1,
        text: '课堂运营记录初稿',
        links: [],
        attachments: [],
        submittedAt: '2026-07-01T08:00:00.000Z',
      }],
    }
    localStorage.setItem(key, JSON.stringify(record))
  })

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/reviews')
  await page.locator('[data-plan-filter]').selectOption('plan-wdds')
  await page.locator('[data-unit-filter]').selectOption('unit-01-01')
  await page.locator('[data-student-filter]').fill('学生')
  await page.locator('[data-sort-order]').selectOption('newest')

  await page.locator('[data-review-scope="PLAN"]').click()
  await page.locator('[data-processing-state="PENDING"]').click()
  await expect(page.locator('[data-review-row]')).toContainText('店铺基本设置')
  await assertFiltersPreserved(page)

  await page.locator('[data-review-scope="CLASSROOM"]').click()
  await expect(page.locator('[data-review-row]')).toHaveCount(0)
  await assertFiltersPreserved(page)
  await page.locator('[data-processing-state="REVIEWED"]').click()
  await expect(page.locator('[data-review-row]')).toContainText('课堂运营记录')
  await assertFiltersPreserved(page)

  await page.locator('[data-review-scope="PLAN"]').click()
  await expect(page.locator('[data-review-row]')).toHaveCount(0)
  await assertFiltersPreserved(page)
  await page.locator('[data-processing-state="PENDING"]').click()
  await expect(page.locator('[data-review-row]')).toContainText('店铺基本设置')
  await assertFiltersPreserved(page)
})

async function assertFiltersPreserved(page: import('@playwright/test').Page) {
  await expect(page.locator('[data-plan-filter]')).toHaveValue('plan-wdds')
  await expect(page.locator('[data-unit-filter]')).toHaveValue('unit-01-01')
  await expect(page.locator('[data-student-filter]')).toHaveValue('学生')
  await expect(page.locator('[data-sort-order]')).toHaveValue('newest')
}

/**
 * Given an Owner has a submitted practice version
 * When the Owner opens quick review and the matching plan review entry
 * Then both entries open the same authorized submission detail contract
 */
test('[ASSUME-S4-001] owner review entry points share the detail contract', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('用于统一审核入口的店铺设置成果。')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum')
  const quickLink = page.locator('[data-review-quick-link]')
  await expect(quickLink).toHaveAttribute('href', '/practicum/submissions/act-01-003')
  await quickLink.click()
  await expect(page).toHaveURL(/\/practicum\/submissions\/act-01-003$/)
  await expect(page.locator('[data-submission-detail]')).toBeVisible()
  await expect(page.locator('[data-version-history]')).toContainText('版本 1')
  await expect(page.locator('[data-detail-status]')).toHaveText('待审核')

  await page.goto('/practicum/plans/plan-wdds')
  const planLink = page.locator('[data-plan-review-link]')
  await expect(planLink).toHaveAttribute('href', '/practicum/submissions/act-01-003')
  await planLink.click()
  await expect(page).toHaveURL(/\/practicum\/submissions\/act-01-003$/)
  await expect(page.locator('[data-submission-detail]')).toBeVisible()
  await expect(page.locator('[data-version-history]')).toContainText('版本 1')
  await expect(page.locator('[data-detail-status]')).toHaveText('待审核')
})

/**
 * Given an authorized user reaches each applicable review state
 * When the user loads the queue or submission detail
 * Then loading empty forbidden returned graded and immutable-history outcomes are visible
 */
test('[ASSUME-S4-001] review surfaces expose their complete state set', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/activities/act-01-003')
  await page.locator('[data-practice-draft]').fill('用于状态覆盖的店铺设置成果。')
  await page.locator('[data-save-draft]').click()
  await page.locator('[data-submit-practice]').click()
  await page.locator('[data-confirm-submit]').click()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await page.goto('/practicum/reviews', { waitUntil: 'commit' })
  await expect(page.locator('[data-review-loading]')).toBeVisible()
  await expect(page.locator('[data-review-loading]')).toBeHidden()
  await expect(page.locator('[data-review-row]')).toHaveCount(1)

  await page.locator('[data-student-filter]').fill('不存在的学生')
  await expect(page.locator('[data-empty]')).toContainText('没有提交')
  await page.locator('[data-student-filter]').fill('')

  await page.goto('/practicum/submissions/act-01-003')
  await page.locator('[data-return-feedback]').fill('请补充状态覆盖说明。')
  await page.locator('[data-return-action]').click()
  await page.locator('[data-confirm-return]').click()
  await expect(page.locator('[data-detail-status]')).toHaveText('已退回')
  await expect(page.locator('[data-feedback-history]')).toContainText('请补充状态覆盖说明。')
  await expect(page.locator('[data-history-version]')).toHaveCount(1)

  await page.evaluate(() => {
    const key = 'digital-commerce-practicum.v1'
    const record = JSON.parse(localStorage.getItem(key) ?? '{}')
    record.practiceSubmissions['act-01-003'].status = 'GRADED'
    record.practiceSubmissions['act-01-003'].grade = {
      reviewerId: 'owner-001',
      rubricScores: { 'rubric-1': 35, 'rubric-2': 26, 'rubric-3': 27 },
      feedback: '状态覆盖评分记录。',
      createdAt: '2026-07-22T08:00:00.000Z',
    }
    localStorage.setItem(key, JSON.stringify(record))
  })
  await page.reload()
  await expect(page.locator('[data-detail-status]')).toHaveText('已评分')
  await expect(page.locator('[data-grade-summary]')).toContainText('状态覆盖评分记录。')
  await expect(page.locator('[data-finalize-grade]')).toHaveCount(0)
  await expect(page.locator('[data-history-version]')).toHaveCount(1)

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await page.goto('/practicum/submissions/act-01-003')
  await expect(page.locator('[data-forbidden]')).toBeVisible()
  await expect(page.locator('[data-submission-detail]')).toHaveCount(0)
})
