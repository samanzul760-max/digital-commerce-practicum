import { createError, defineEventHandler, getRequestProtocol, readBody, setCookie } from 'h3'
import { AUTH_COOKIE, CSRF_COOKIE, bootstrapOwner, createSession, type BootstrapOwnerInput } from '../../utils/auth-store'
import { shouldUseSecureCookies } from '../../utils/auth-cookie'

export default defineEventHandler(async (event) => {
  const result = bootstrapOwner(await readBody<BootstrapOwnerInput>(event))
  if (result.kind === 'ALREADY_COMPLETED') {
    throw createError({ statusCode: 409, statusMessage: 'BOOTSTRAP_ALREADY_COMPLETED', data: { code: 'BOOTSTRAP_ALREADY_COMPLETED' } })
  }
  if (result.kind === 'INVALID') {
    throw createError({ statusCode: 422, statusMessage: 'BOOTSTRAP_INVALID_INPUT', data: { code: 'BOOTSTRAP_INVALID_INPUT' } })
  }
  const session = createSession(result.user)
  const secure = shouldUseSecureCookies(getRequestProtocol(event, { xForwardedProto: true }))
  setCookie(event, AUTH_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
  })
  setCookie(event, CSRF_COOKIE, session.csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
  })
  return { user: result.user }
})
