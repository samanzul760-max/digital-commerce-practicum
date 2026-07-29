import type { Page } from '@playwright/test'

const csrfCookieName = 'practicum_csrf'

export async function csrfHeaders(page: Page, headers: Record<string, string> = {}) {
  const token = (await page.context().cookies()).find(cookie => cookie.name === csrfCookieName)?.value
  if (!token) throw new Error('Expected an authenticated CSRF cookie before a protected write request')
  return { ...headers, 'x-csrf-token': token }
}
