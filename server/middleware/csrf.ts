import { createError, defineEventHandler, getCookie, getRequestHeader, getRequestURL } from 'h3'
import { AUTH_COOKIE, getSessionCsrfToken } from '../utils/auth-store'

const protectedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export default defineEventHandler((event) => {
  if (!protectedMethods.has(event.method) || !getRequestURL(event).pathname.startsWith('/api/practicum/')) return

  const sessionToken = getCookie(event, AUTH_COOKIE)
  if (!sessionToken) return

  const expectedToken = getSessionCsrfToken(sessionToken)
  if (!expectedToken || getRequestHeader(event, 'x-csrf-token') !== expectedToken) {
    throw createError({ statusCode: 403, statusMessage: 'CSRF_INVALID', data: { code: 'CSRF_INVALID' } })
  }
})
