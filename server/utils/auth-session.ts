import { createError, type H3Event } from 'h3'
import type { AuthUser, SessionContext } from './auth-store'

export function getAuthenticatedUser(event: H3Event) {
  return (event.context.learnecAuth as SessionContext | undefined)?.user ?? null
}

export function requireAuthenticatedUser(event: H3Event) {
  const user = getAuthenticatedUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_REQUIRED', data: { code: 'AUTH_REQUIRED' } })
  }
  return user
}
