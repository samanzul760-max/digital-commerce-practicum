import { createError, defineEventHandler, readBody, setCookie } from 'h3'
import { AUTH_COOKIE, createSession, verifyCredentials } from '../../utils/auth-store'

interface LoginBody {
  identifier?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const user = verifyCredentials(body?.identifier ?? '', body?.password ?? '')
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_INVALID_CREDENTIALS', data: { code: 'AUTH_INVALID_CREDENTIALS' } })
  }
  const session = createSession(user)
  setCookie(event, AUTH_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
  })
  return { user }
})
