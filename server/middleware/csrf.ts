import { createError, defineEventHandler, getRequestHeader, getRequestURL } from 'h3'
import { csrfTokenMatches, type SessionContext } from '../utils/auth-store'

const protectedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname
  const requiresCsrf = pathname.startsWith('/api/practicum/') || pathname.startsWith('/api/admin/') || pathname === '/api/auth/switch-role' || pathname === '/api/auth/profile' || pathname === '/api/auth/logout'
  if (!protectedMethods.has(event.method) || !requiresCsrf) return

  const session = event.context.learnecAuth as SessionContext | undefined
  if (!session) return

  const csrfToken = getRequestHeader(event, 'x-csrf-token')
  if (!csrfToken || !csrfTokenMatches(csrfToken, session.csrfTokenHash)) {
    throw createError({ statusCode: 403, statusMessage: 'CSRF_INVALID', data: { code: 'CSRF_INVALID' } })
  }
})
