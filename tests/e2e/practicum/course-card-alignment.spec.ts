import { expect, test } from '@playwright/test'
import { loginAsOwner } from './auth-helpers'

/**
 * Given an owner sees draft and published courses in the same course-hall row
 * When the course cards are laid out on desktop
 * Then every card in that row has aligned top and bottom edges
 */
test('[ASSUME-S2-001] mixed-status course cards stay aligned in each desktop row', async ({ page }) => {
  const consoleProblems: string[] = []
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') consoleProblems.push(message.text())
  })
  await loginAsOwner(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route('**/api/practicum/plans**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [
        course('mixed-published', '已发布课程', 'PUBLISHED', '2099-01-03T00:00:00Z'),
        course('mixed-draft-a', '草稿课程一', 'DRAFT', '2099-01-02T00:00:00Z'),
        course('mixed-draft-b', '草稿课程二', 'DRAFT', '2099-01-01T00:00:00Z'),
      ],
      total: 3,
      page: 1,
      pageSize: 50,
    }),
  }))
  await page.goto('/practicum/courses')

  const cards = page.locator('.course-card-wrap [data-course-card]').filter({ hasText: /已发布课程|草稿课程/ })
  await expect(cards).toHaveCount(3)
  const boxes = await cards.evaluateAll(elements => elements.map((element) => {
    const box = element.getBoundingClientRect()
    return { top: box.top, bottom: box.bottom }
  }))

  expect(Math.max(...boxes.map(box => box.top)) - Math.min(...boxes.map(box => box.top))).toBeLessThanOrEqual(1)
  expect(Math.max(...boxes.map(box => box.bottom)) - Math.min(...boxes.map(box => box.bottom))).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'output/playwright/course-card-alignment-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'output/playwright/course-card-alignment-mobile.png', fullPage: true })
  expect(consoleProblems).toEqual([])
})

function course(id: string, title: string, status: 'DRAFT' | 'PUBLISHED', updatedAt: string) {
  return {
    id,
    roomId: 'room-001',
    title,
    description: `${title}说明`,
    status,
    sort: 0,
    moduleIds: [],
    createdAt: updatedAt,
    updatedAt,
  }
}
