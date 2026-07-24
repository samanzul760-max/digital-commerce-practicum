import { expect, test } from '@playwright/test'

/**
 * Given a Student has selected the Student identity
 * When the Student opens the practicum workspace
 * Then the student navigation omits the redundant course link and today actions are summarized above the work area
 */
test('[ORIGINAL-S1-001] Student workspace preserves the approved UI baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  await expect(page.locator('[data-nav-key]')).toHaveCount(4)
  await expect(page.locator('[data-nav-key="workspace"]')).toHaveAttribute('aria-current', 'page')
  const visibleNavText = await page.locator('[data-nav-key]').evaluateAll(items =>
    items.map(item => item.textContent?.replace(/\s+/g, '') ?? ''),
  )
  expect(visibleNavText).toEqual(['总览', '案例', '任务', '成长数据'])
  await expect(page.locator('[data-nav-key="plans"]')).toHaveCount(0)
  await expect(page.locator('[data-nav-key] .nav-symbol svg')).toHaveCount(4)
  await expect(page.locator('[data-context-label]')).toContainText('总览')
  await expect(page.locator('[data-student-home]')).toBeVisible()
  await expect(page.locator('[data-student-home] .panel-head strong').filter({ hasText: /^继续学习$/ })).toBeVisible()
  await expect(page.locator('[data-task-summary]')).toBeVisible()
  await expect(page.locator('[data-feedback-summary]')).toBeVisible()
  await expect(page.locator('[data-student-todo-panel]')).toHaveCount(0)

  const geometry = await page.evaluate(() => {
    const sidebar = document.querySelector<HTMLElement>('[data-practicum-sidebar]')
    const topbar = document.querySelector<HTMLElement>('[data-practicum-topbar]')
    const personal = document.querySelector<HTMLElement>('[data-personal-entry]')
    return {
      sidebarWidth: sidebar?.getBoundingClientRect().width ?? 0,
      topbarHeight: topbar?.getBoundingClientRect().height ?? 0,
      personalHeight: personal?.getBoundingClientRect().height ?? 0,
    }
  })

  expect(geometry.sidebarWidth).toBe(240)
  expect(geometry.topbarHeight).toBe(72)
  expect(geometry.personalHeight).toBeGreaterThanOrEqual(44)
})

/**
 * Given an Owner opens the data center
 * When the overview metrics render
 * Then they use the shared white metric strip instead of generic form panels
 */
test('[UI-CLEANUP-001] data center overview metrics use the shared metric strip', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  await page.goto('/practicum/data-center')

  const overview = page.locator('[data-overview-metrics]')
  await expect(overview).toBeVisible()
  await expect(overview.locator('.metric-strip')).toBeVisible()
  await expect(overview.locator('.metric')).toHaveCount(4)
  await expect(overview.locator('.form-panel')).toHaveCount(0)
})

/**
 * Given an Owner opens the workspace home
 * When the management overview renders
 * Then operational reminders are summarized in the top metrics instead of a duplicate side panel
 */
test('[UI-CLEANUP-002] owner home summarizes operational reminders without a side todo panel', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  await expect(page.locator('[data-owner-home] [data-owner-todo-summary]')).toBeVisible()
  await expect(page.locator('[data-owner-home] [data-owner-todo-panel]')).toHaveCount(0)
  await expect(page.locator('[data-owner-home] .panel-head').filter({ hasText: /^待办任务$/ })).toHaveCount(0)
  await expect(page.locator('[data-owner-home] .dashboard-split-single')).toBeVisible()
})
