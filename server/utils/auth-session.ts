import { createError, getCookie, type H3Event } from 'h3'
import { AUTH_COOKIE, getSessionUser } from './auth-store'

export function getAuthenticatedUser(event: H3Event) {
  return getSessionUser(getCookie(event, AUTH_COOKIE))
}

export function requireAuthenticatedUser(event: H3Event) {
  const user = getAuthenticatedUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_REQUIRED', data: { code: 'AUTH_REQUIRED' } })
  }
  return user
}
