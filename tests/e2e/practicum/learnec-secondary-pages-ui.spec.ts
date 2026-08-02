import { expect, test, type Page } from '@playwright/test'

async function selectWorkspaceRole(page: Page, role: 'OWNER' | 'STUDENT') {
  await page.goto('/practicum/profile')
  await page.locator(`[data-role-option="${role}"]`).click()
  await expect(page).toHaveURL('/practicum')
}

test('member management uses LearnEC list, controls, and paper surfaces', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  await page.route('**/api/practicum/members**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{ id: 'member-ui-001', label: '数据二组 01号学员', role: 'STUDENT', group: '数据二组' }],
      groups: [{ id: 'group-data', name: '数据二组', memberCount: 1 }],
    }),
  }))
  await page.goto('/practicum/members')

  const row = page.locator('[data-member-row]')
  await expect(row).toHaveClass(/member-management-row/)
  await expect(row).toHaveClass(/paper/)
  await expect(row.locator('[data-save-member-group]')).toHaveClass(/secondary-button/)
  await expect(row.locator('[data-change-member-role]')).toHaveClass(/secondary-button/)
  await expect(row.locator('[data-remove-member]')).toHaveClass(/secondary-button/)

  const inputStyle = await row.locator('[data-member-group]').evaluate(element => {
    const style = getComputedStyle(element)
    return { height: style.height, borderColor: style.borderColor, borderRadius: style.borderRadius }
  })
  expect(inputStyle).toEqual({ height: '32px', borderColor: 'rgb(233, 237, 240)', borderRadius: '4px' })
  await expect(page.locator('[data-member-group-summary]')).toHaveClass(/paper/)
})

test('owner task permission state offers a polished student-view shortcut', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  await page.goto('/practicum/tasks')

  const state = page.locator('[data-forbidden]')
  await expect(state).toHaveClass(/permission-empty-state/)
  await expect(state).toHaveClass(/paper/)
  await expect(state.locator('.permission-empty-icon .practicum-icon')).toBeVisible()
  await expect(state).toContainText('学生任务页仅学生视角可用')

  const switchButton = state.locator('[data-switch-to-student]')
  await expect(switchButton).toHaveClass(/blue-btn/)
  await switchButton.click()
  await expect(page.locator('[data-student-tasks]')).toBeVisible()
})

test('student task metrics and todo actions use LearnEC paper and button styles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await selectWorkspaceRole(page, 'STUDENT')
  await page.goto('/practicum/tasks')

  await expect(page.locator('[data-task-metrics] .metric.paper')).toHaveCount(4)
  await expect(page.locator('[data-server-todo-list]')).toHaveClass(/paper/)
  await expect(page.locator('.todo-item .blue-btn').first()).toBeVisible()
  const mobileLayout = await page.evaluate(() => {
    const topbar = document.querySelector<HTMLElement>('[data-practicum-topbar]')?.getBoundingClientRect()
    const tabs = document.querySelector<HTMLElement>('[data-practicum-topbar] .topbar-tabs')?.getBoundingClientRect()
    const backbar = document.querySelector<HTMLElement>('[data-workspace-backbar]')?.getBoundingClientRect()
    const heading = document.querySelector<HTMLElement>('[data-student-tasks] h1')?.getBoundingClientRect()
    return {
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      tabsContainedByTopbar: Boolean(topbar && tabs && tabs.bottom <= topbar.bottom + 1),
      topbarClearsBackbar: Boolean(topbar && backbar && topbar.bottom <= backbar.top + 1),
      backbarClearsHeading: Boolean(backbar && heading && backbar.bottom <= heading.top + 1),
    }
  })
  expect(mobileLayout).toEqual({ noHorizontalOverflow: true, tabsContainedByTopbar: true, topbarClearsBackbar: true, backbarClearsHeading: true })
})

test('class achievement metrics and radar use paper surfaces with safe labels', async ({ page }) => {
  await selectWorkspaceRole(page, 'OWNER')
  await page.goto('/practicum/achievements')

  await expect(page.locator('[data-achievement-metrics] .paper')).toHaveCount(4)
  await expect(page.locator('[data-achievement-radar]')).toHaveClass(/paper/)
  const labelsFit = await page.locator('[data-achievement-radar] svg').evaluate(svg => {
    const svgBox = svg.getBoundingClientRect()
    return Array.from(svg.querySelectorAll('text')).every((label) => {
      const box = label.getBoundingClientRect()
      return box.left >= svgBox.left && box.right <= svgBox.right && box.top >= svgBox.top && box.bottom <= svgBox.bottom
    })
  })
  expect(labelsFit).toBe(true)
})
