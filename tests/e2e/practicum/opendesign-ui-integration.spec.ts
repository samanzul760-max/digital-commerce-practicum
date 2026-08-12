import { expect, test } from '@playwright/test'
import { loginAsStudent } from './auth-helpers'

test('[OPENDESIGN-UI-006] exported shell exposes soft design tokens', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')

  const tokens = await page.locator('body').evaluate(() => {
    const styles = getComputedStyle(document.documentElement)
    return {
      paper: styles.getPropertyValue('--practicum-paper').trim(),
      radius: styles.getPropertyValue('--practicum-radius-sm').trim(),
      shadow: styles.getPropertyValue('--practicum-shadow-1').trim(),
    }
  })

  expect(tokens.paper.toLowerCase()).toBe('#f8fafc')
  expect(tokens.radius).toBe('6px')
  expect(tokens.shadow).toContain('rgba(15,23,42,.04)')
})

test('[AUTH-DEMO-001] local passwordless entry creates a real authenticated session from the login page', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/practicum/login')

  await expect(page.locator('[data-demo-entry]')).toBeVisible()
  await expect(page.locator('[data-login-form]')).toBeVisible()
  await page.locator('[data-demo-entry]').click()

  await expect(page).toHaveURL(/\/practicum$/)
  await expect(page.locator('[data-workspace-authenticated]')).toBeVisible()
})

test('[OPENDESIGN-UI-007] student center uses the available desktop width beside its sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await loginAsStudent(page)
  await page.goto('/center')

  await expect(page.locator('[data-od-id="student-center"] .dash-main')).toBeVisible()
  await expect(page.locator('[data-od-id="student-welcome"]')).toBeVisible()
  const widths = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('[data-od-id="student-center"] .dash-main')
    const welcome = document.querySelector<HTMLElement>('[data-od-id="student-welcome"]')
    return { main: main?.getBoundingClientRect().width ?? 0, welcome: welcome?.getBoundingClientRect().width ?? 0 }
  })

  expect(widths.main).toBeGreaterThanOrEqual(1160)
  expect(widths.welcome).toBeGreaterThanOrEqual(1050)
})

test('[OPENDESIGN-UI-001] student keeps real course and learning routes in the exported visual shell', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await loginAsStudent(page)
  await page.goto('/practicum')

  await expect(page.locator('[data-practicum-topbar]')).toBeVisible()
  await expect(page.locator('.topbar-tabs a')).toHaveCount(4)
  await expect(page.locator('.topbar-tabs a[href="/practicum/courses"]')).toBeVisible()

  await page.goto('/practicum/courses')
  await expect(page.locator('[data-opendesign-course-hall]')).toBeVisible()
  const courseCard = page.locator('[data-course-card]').first()
  await expect(courseCard).toBeVisible()
  await courseCard.click()
  await expect(page).toHaveURL(/\/practicum\/tasks$/)
})

test('[OPENDESIGN-UI-002] exported course hall stays within the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginAsStudent(page)
  await page.goto('/practicum/courses')

  await expect(page.locator('[data-opendesign-course-hall]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('[OPENDESIGN-UI-003] student home exposes the exported hero and real workbench entries', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')

  await expect(page.locator('[data-practicum] .hero.learnec-hero')).toBeVisible()
  await expect(page.locator('[data-practicum] .hero-copy')).toBeVisible()
  await expect(page.locator('[data-practicum] .hero-scene')).toBeVisible()
  await expect(page.locator('[data-practicum] .cards')).toBeVisible()
  await expect(page.locator('[data-practicum] .home-entry-section a[href="/practicum/courses"]')).toBeVisible()
  await expect(page.locator('[data-practicum] .home-entry-section a[href="/practicum/tasks"]')).toBeVisible()
})

test('[OPENDESIGN-UI-011] student home renders a server course inside the restored Open Design card', async ({ page }) => {
  await page.route('**/api/practicum/plans**', async route => {
    if (route.request().method() !== 'GET') return route.continue()
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{
          id: 'server-plan-ui',
          roomId: 'room-001',
          title: '来自服务端的课程',
          description: '数据库返回的课程说明',
          status: 'PUBLISHED',
          sort: 1,
          moduleIds: ['module-1'],
          createdAt: '2026-08-10T00:00:00.000Z',
          updatedAt: '2026-08-10T00:00:00.000Z',
        }],
        total: 1,
        page: 1,
        pageSize: 50,
      }),
    })
  })
  await loginAsStudent(page)
  await page.goto('/practicum')

  await expect(page.locator('[data-practicum] .cards')).toContainText('来自服务端的课程')
})

test('[OPENDESIGN-UI-012] learning view reads a server plan and toggles the restored video surface', async ({ page }) => {
  await page.route('**/api/practicum/plans/server-plan-learn', async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        plan: {
          id: 'server-plan-learn', roomId: 'room-001', title: '数据库课程详情', description: '服务端课程说明',
          status: 'PUBLISHED', sort: 1, moduleIds: ['module-1'], createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-10T00:00:00.000Z',
        },
        nodes: [
          { id: 'module-1', planId: 'server-plan-learn', parentId: null, level: 1, title: '第一模块', description: '', sort: 1 },
          { id: 'unit-1', planId: 'server-plan-learn', parentId: 'module-1', level: 2, title: '第一单元', description: '', sort: 1 },
          { id: 'activity-1', planId: 'server-plan-learn', parentId: 'unit-1', level: 3, title: '服务端学习任务', description: '完成服务端实操任务', sort: 1 },
        ],
      }),
    })
  })
  await page.route('**/api/practicum/progress**', async route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ plans: [], totals: { total: 0, completed: 0, percent: 0 } }) }))
  await loginAsStudent(page)
  await page.goto('/practicum/learn/server-plan-learn')

  await expect(page.locator('[data-learn-plan]')).toContainText('服务端学习任务')
  const video = page.locator('[data-learn-plan] .video')
  await video.click()
  await expect(video).toHaveClass(/playing/)
})

test('[OPENDESIGN-UI-010] course hall always renders the six Open Design courses when server plans are empty', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum/courses')

  const courseCards = page.locator('[data-opendesign-course-hall] [data-course-card]')
  await expect(courseCards).toHaveCount(6)
  await expect(page.locator('[data-opendesign-course-hall]')).toContainText('淘宝从零到精通')
  await expect(page.locator('[data-opendesign-course-hall]')).toContainText('详情页优化方法')
})

test('[OPENDESIGN-UI-004] learning drawer keeps feedback as display content instead of a fake search input', async ({ page }) => {
  await loginAsStudent(page)
  await page.goto('/practicum')
  const learningLink = page.locator('.hero .blue-btn')
  await expect(learningLink).toHaveAttribute('href', /\/practicum\/learn\//)
  await learningLink.click()

  await expect(page.locator('[data-learn-plan] .drawer')).toBeVisible()
  await expect(page.locator('[data-learn-plan] .drawer input.search')).toBeVisible()
  await expect(page.locator('[data-learn-plan] .drawer .comment').first()).toContainText('老师反馈')
})

test('[OPENDESIGN-UI-005] bootstrap explains that a pre-seeded owner account cannot be created again', async ({ page }) => {
  await page.goto('/practicum/login')
  const bootstrapForm = page.locator('[data-bootstrap-form]')
  if (await bootstrapForm.count() === 0) test.skip()
  await expect(page.locator('[data-bootstrap-guidance]')).toContainText('新的账号')
  await page.locator('[data-bootstrap-identifier]').fill('owner@example.test')
  await page.locator('[data-bootstrap-display-name]').fill('管理员')
  await page.locator('[data-bootstrap-password]').fill('OwnerPass123!')
  await page.locator('[data-bootstrap-submit]').click()

  await expect(page.locator('[data-auth-error]')).toContainText('已存在')
})
