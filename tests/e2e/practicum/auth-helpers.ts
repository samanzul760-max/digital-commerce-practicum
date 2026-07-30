import { expect, type Page } from '@playwright/test'

export async function loginAsStudent(page: Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { identifier: 'student@example.test', password: 'StudentPass123!' },
  })
  expect(response.status()).toBe(200)
}
