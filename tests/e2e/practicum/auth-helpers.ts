import { expect, type Page } from '@playwright/test'

export async function loginAsStudent(page: Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { identifier: 'student@example.test', password: 'StudentPass123!' },
  })
  expect(response.status()).toBe(200)
}

export async function loginAsTeacher(page: Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { identifier: 'teacher@example.test', password: 'TeacherPass123!' },
  })
  expect(response.status()).toBe(200)
}

export async function loginAsOwner(page: Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { identifier: 'owner@example.test', password: 'OwnerPass123!' },
  })
  expect(response.status()).toBe(200)
}
