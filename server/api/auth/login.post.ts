import { createError, defineEventHandler, getRequestProtocol, readBody, setCookie } from 'h3'
import { AUTH_COOKIE, CSRF_COOKIE, createSession, verifyCredentials } from '../../utils/auth-store'
import { shouldUseSecureCookies } from '../../utils/auth-cookie'

const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 10

interface LoginBody {
  identifier?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const address = event.node.req.socket.remoteAddress ?? 'unknown'
  const now = Date.now()
  const current = attempts.get(address)
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    throw createError({ statusCode: 429, statusMessage: 'AUTH_RATE_LIMITED', data: { code: 'AUTH_RATE_LIMITED' } })
  }
  const body = await readBody<LoginBody>(event)
  const user = await verifyCredentials(body?.identifier ?? '', body?.password ?? '')
  if (!user) {
    const next = current && current.resetAt > now ? current : { count: 0, resetAt: now + WINDOW_MS }
    attempts.set(address, { count: next.count + 1, resetAt: next.resetAt })
    throw createError({ statusCode: 401, statusMessage: 'AUTH_INVALID_CREDENTIALS', data: { code: 'AUTH_INVALID_CREDENTIALS' } })
  }
  attempts.delete(address)
  const session = await createSession(user)
  const secure = shouldUseSecureCookies(getRequestProtocol(event, { xForwardedProto: true }))
  setCookie(event, AUTH_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
  })
  setCookie(event, CSRF_COOKIE, session.csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
  })
  return { user }
})
