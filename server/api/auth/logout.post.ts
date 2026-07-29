import { defineEventHandler, deleteCookie, getCookie } from 'h3'
import { AUTH_COOKIE, CSRF_COOKIE, revokeSession } from '../../utils/auth-store'

export default defineEventHandler((event) => {
  revokeSession(getCookie(event, AUTH_COOKIE))
  deleteCookie(event, AUTH_COOKIE, { path: '/' })
  deleteCookie(event, CSRF_COOKIE, { path: '/' })
  return { ok: true }
})
