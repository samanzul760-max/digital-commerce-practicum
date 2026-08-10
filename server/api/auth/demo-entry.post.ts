import { createError, defineEventHandler, getRequestProtocol, setCookie } from 'h3'
import { AUTH_COOKIE, CSRF_COOKIE, createSession, verifyCredentials } from '../../utils/auth-store'
import { shouldUseSecureCookies } from '../../utils/auth-cookie'

export default defineEventHandler(async (event) => {
  if (process.env.PRACTICUM_DEMO_ACCESS !== 'true') {
    throw createError({ statusCode: 404, statusMessage: 'DEMO_ACCESS_DISABLED', data: { code: 'DEMO_ACCESS_DISABLED' } })
  }

  const identifier = process.env.DEMO_ADMIN_IDENTIFIER ?? 'admin'
  const password = process.env.DEMO_ADMIN_PASSWORD ?? ''
  const user = await verifyCredentials(identifier, password)
  if (!user || user.role !== 'ADMIN') {
    throw createError({ statusCode: 503, statusMessage: 'DEMO_USER_UNAVAILABLE', data: { code: 'DEMO_USER_UNAVAILABLE' } })
  }

  const session = await createSession(user)
  const secure = shouldUseSecureCookies(getRequestProtocol(event, { xForwardedProto: true }))
  const maxAge = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
  setCookie(event, AUTH_COOKIE, session.token, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge })
  setCookie(event, CSRF_COOKIE, session.csrfToken, { httpOnly: false, sameSite: 'lax', secure, path: '/', maxAge })

  return { user }
})
