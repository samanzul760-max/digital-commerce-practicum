import { expect, test } from '@playwright/test'

/**
 * Given a user navigates to the practicum workspace
 * When the page loads
 * Then the shared sidebar, top bar and content area render with the approved design tokens
 */
test('[ORIGINAL-S1-001] shared workspace shell renders with sidebar topbar and content area', async ({ page }) => {
  await page.goto('/practicum')

  // Shared shell structure
  await expect(page.locator('[data-practicum-shell]')).toBeVisible()
  await expect(page.locator('[data-practicum-sidebar]')).toBeVisible()
  await expect(page.locator('[data-practicum-topbar]')).toBeVisible()
  await expect(page.locator('[data-practicum-content]')).toBeVisible()

  // Approved design tokens are loaded
  await expect(page.locator('body')).toHaveCSS('font-family', /Microsoft YaHei/)
})

/**
 * Given a user navigates to the practicum workspace
 * When the page renders
 * Then the top bar shows a personal menu trigger and no inline role buttons are visible
 */
test('[ORIGINAL-S1-001] topbar has personal entry and no inline role selector', async ({ page }) => {
  await page.goto('/practicum')

  // Topbar has a personal menu trigger
  await expect(page.locator('[data-personal-entry]')).toBeVisible()

  // No inline role selector buttons on the page
  await expect(page.locator('[data-role-options]')).toHaveCount(0)
  await expect(page.locator('[data-role-option]')).toHaveCount(0)
})

/**
 * Given a user opens the personal page
 * When the page renders
 * Then Student is in the main group and Owner is in a separate management group
 */
test('[ORIGINAL-S1-001] profile page groups student and owner identities', async ({ page }) => {
  await page.goto('/practicum/profile')

  // Student is in the main identity group
  const mainGroup = page.locator('[data-identity-choices]')
  await expect(mainGroup.locator('[data-role-option="STUDENT"]')).toBeVisible()

  // Owner is in a separate management group
  const mgmtGroup = page.locator('[data-management-group]')
  await expect(mgmtGroup.locator('[data-role-option="OWNER"]')).toBeVisible()
  await expect(mainGroup.locator('[data-role-option="OWNER"]')).toHaveCount(0)
  const roleValues = await page.locator('[data-role-option]').evaluateAll(options =>
    options.map(option => option.getAttribute('data-role-option')).sort(),
  )
  expect(roleValues).toEqual(['OWNER', 'STUDENT'])
})

/**
 * Given a user selects a different identity on the personal page
 * When the identity is changed
 * Then the user returns to the workspace and the new identity is announced
 */
test('[ORIGINAL-S1-001] switching identity returns to workspace and announces new role', async ({ page }) => {
  await page.goto('/practicum/profile')

  // Select Owner identity
  await page.locator('[data-role-option="OWNER"]').click()

  // Should navigate back to workspace
  await expect(page).toHaveURL('/practicum')

  // Active role should be announced via live region
  const liveRegion = page.locator('[data-role-live-region]')
  await expect(liveRegion).toBeVisible()
  await expect(liveRegion).toContainText('管理员')
})

/**
 * Given a user has selected a role identity
 * When the user visits the workspace home
 * Then the home shows role-appropriate content and avoids fake planned entries
 */
test('[ORIGINAL-S1-001] role homes show role-appropriate content and hide unopened student entries', async ({ page }) => {
  // Student home
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')
  await expect(page.locator('[data-student-home]')).toBeVisible()
  await expect(page.locator('[data-owner-home]')).toHaveCount(0)
  await expect(page.locator('[data-student-home] .planned-grid')).toHaveCount(0)

  // Owner home
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')
  await expect(page.locator('[data-owner-home]')).toBeVisible()
  await expect(page.locator('[data-student-home]')).toHaveCount(0)
  await expect(page.locator('[data-owner-home] .planned-entry')).toHaveCount(0)
})

/**
 * Given the practicum workspace is rendered at mobile and desktop widths
 * When the page is viewed at 375px and 1440px
 * Then there is no horizontal overflow and no technical Slice copy visible
 */
test('[ORIGINAL-S1-001] responsive layout has no horizontal overflow or technical copy', async ({ page }) => {
  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  // 375px mobile: no horizontal overflow
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(page.locator('[data-practicum-shell]')).toBeVisible()
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(mobileOverflow).toBe(true)

  // 1440px desktop: no horizontal overflow
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('[data-practicum-shell]')).toBeVisible()
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(desktopOverflow).toBe(true)

  // No technical Slice copy visible
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toContain('Slice')
  expect(bodyText).not.toContain('BDD')
  expect(bodyText).not.toContain('TDD')
})

/**
 * Given the practicum UI follows the approved user-facing baseline
 * When Student and Owner pages render
 * Then developer-facing notes and fake planned entries are not visible
 */
test('[UI-CLEANUP-001] visible copy stays user-facing and avoids fake entries', async ({ page }) => {
  const forbiddenCopy = [
    '本周实训节奏',
    '跨境电商项目推进中',
    '完成小组互评',
    '小组互评',
    '通知只保留在右上角',
    '只放账号与低频设置',
    '今天要做什么',
    '把教学安排',
    '学生端首屏优先',
    '只显示和学生有关',
    '按时间推进',
    '只显示需要行动',
    '保留最常用动作',
    '成员与实训室设置放在右上个人菜单中',
  ]

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')
  await page.locator('[data-notification-btn]').click()
  await expect(page.getByText('查看近期消息和提醒')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.locator('[data-personal-entry]').click()
  await expect(page.getByText('管理账号、成员与实训室')).toBeVisible()

  let bodyText = await page.locator('body').innerText()
  for (const copy of forbiddenCopy) {
    expect(bodyText).not.toContain(copy)
  }

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  bodyText = await page.locator('body').innerText()
  for (const copy of forbiddenCopy) {
    expect(bodyText).not.toContain(copy)
  }
  await expect(page.getByRole('heading', { name: '常用入口' }).first()).toBeVisible()
  await expect(page.getByText('配置实训室介绍与宣传信息')).toHaveCount(0)
})

/**
 * Given a student or owner opens the shared workspace shell
 * When navigation and topbar actions render
 * Then semantic SVG icons replace placeholder glyphs without changing navigation structure
 */
test('[UI-ICONS-001] shared navigation uses semantic icons and keeps role navigation intact', async ({ page }) => {
  const placeholderGlyphs = /[□▣▤▥▧]/

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="STUDENT"]').click()
  await expect(page).toHaveURL('/practicum')

  const studentNav = page.locator('[data-practicum-sidebar] [data-nav-item]')
  await expect(studentNav).toHaveCount(4)
  await expect(studentNav.nth(0)).toHaveAttribute('data-nav-key', 'workspace')
  await expect(studentNav.locator('[data-nav-key="plans"]')).toHaveCount(0)
  await expect(studentNav.nth(1)).toHaveAttribute('data-nav-key', 'cases')
  await expect(studentNav.nth(2)).toHaveAttribute('data-nav-key', 'tasks')
  await expect(studentNav.nth(3)).toHaveAttribute('data-nav-key', 'progress')
  await expect(studentNav.locator('.nav-symbol svg')).toHaveCount(4)
  expect((await studentNav.locator('.nav-symbol').allTextContents()).every(item => !placeholderGlyphs.test(item))).toBe(true)

  await page.locator('[data-notification-btn]').click()
  await expect(page.locator('[data-notification-dropdown]')).toBeVisible()

  await page.goto('/practicum/profile')
  await page.locator('[data-role-option="OWNER"]').click()
  await expect(page).toHaveURL('/practicum')

  const ownerNav = page.locator('[data-practicum-sidebar] [data-nav-item]')
  await expect(ownerNav).toHaveCount(5)
  await expect(ownerNav.nth(0)).toHaveAttribute('data-nav-key', 'workspace')
  await expect(ownerNav.nth(1)).toHaveAttribute('data-nav-key', 'plans')
  await expect(ownerNav.nth(2)).toHaveAttribute('data-nav-key', 'cases')
  await expect(ownerNav.nth(3)).toHaveAttribute('data-nav-key', 'reviews')
  await expect(ownerNav.nth(4)).toHaveAttribute('data-nav-key', 'data-center')
  await expect(ownerNav.locator('.nav-symbol svg')).toHaveCount(5)
  expect((await ownerNav.locator('.nav-symbol').allTextContents()).every(item => !placeholderGlyphs.test(item))).toBe(true)
})
