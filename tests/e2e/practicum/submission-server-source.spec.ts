import { expect, test } from '@playwright/test'

test.describe('BDD-SUBMISSION-005/006 server is the submission source of truth', () => {
  test('empty server queue does not render stale local submissions', async ({ page }) => {
    await page.addInitScript(() => {
      const key = 'digital-commerce-practicum.v1'
      const state = JSON.parse(localStorage.getItem(key) ?? '{}')
      state.practiceSubmissions = {
        ...(state.practiceSubmissions ?? {}),
        'act-01-003': {
          status: 'SUBMITTED',
          studentId: 'stale-student',
          studentLabel: '本地残留学生',
          versions: [{
            id: 'stale-version',
            submissionId: 'act-01-003',
            version: 1,
            text: '不应显示的本地残留内容',
            links: [],
            attachments: [],
            submittedAt: '2026-01-01T00:00:00.000Z',
          }],
        },
      }
      localStorage.setItem(key, JSON.stringify(state))
    })
    await page.route('**/api/practicum/submissions**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0 }) })
    })

    await page.goto('/practicum/profile')
    await page.locator('[data-role-option="OWNER"]').click()
    await page.goto('/practicum/reviews')
    await expect(page.locator('[data-empty]')).toContainText('没有提交')
    await expect(page.locator('[data-review-row]')).toHaveCount(0)
    await expect(page.getByText('本地残留学生')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('[data-empty]')).toContainText('没有提交')
    await expect(page.locator('[data-review-row]')).toHaveCount(0)
  })

  test('server queue failure shows an error without leaking local submissions', async ({ page }) => {
    await page.addInitScript(() => {
      const key = 'digital-commerce-practicum.v1'
      const state = JSON.parse(localStorage.getItem(key) ?? '{}')
      state.practiceSubmissions = {
        ...(state.practiceSubmissions ?? {}),
        'act-01-003': { status: 'SUBMITTED', versions: [{ id: 'stale', version: 1, text: '不应显示', submittedAt: '2026-01-01T00:00:00.000Z' }] },
      }
      localStorage.setItem(key, JSON.stringify(state))
    })
    await page.route('**/api/practicum/submissions**', async route => {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ data: { code: 'SUBMISSION_SERVICE_UNAVAILABLE' } }) })
    })

    await page.goto('/practicum/profile')
    await page.locator('[data-role-option="OWNER"]').click()
    await page.goto('/practicum/reviews')
    await expect(page.locator('[data-review-error]')).toContainText('审核队列加载失败')
    await expect(page.locator('[data-review-row]')).toHaveCount(0)
    await expect(page.getByText('不应显示')).toHaveCount(0)
  })

  test('mobile review queue keeps the server empty state usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.route('**/api/practicum/submissions**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0 }) })
    })
    await page.goto('/practicum/profile')
    await page.locator('[data-role-option="OWNER"]').click()
    await page.goto('/practicum/reviews')
    await expect(page.locator('[data-empty]')).toContainText('没有提交')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })
})
