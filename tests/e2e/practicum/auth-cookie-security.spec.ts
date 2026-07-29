import { expect, test } from '@playwright/test'
import { shouldUseSecureCookies } from '../../../server/utils/auth-cookie'

test('HTTP requests do not receive Secure session cookies', () => {
  expect(shouldUseSecureCookies('http')).toBe(false)
})

test('HTTPS requests retain Secure session cookies', () => {
  expect(shouldUseSecureCookies('https')).toBe(true)
})
