import { createError, defineEventHandler, getCookie, readBody } from 'h3'
import { UserRole } from '@prisma/client'
import { AUTH_COOKIE, getSessionUser, setSessionActiveRole } from '../../utils/auth-store'
import { requireAuthenticatedUser } from '../../utils/auth-session'

const allowedRoles = new Set<UserRole>([UserRole.ADMIN, UserRole.STUDENT])

export default defineEventHandler(async (event) => {
  requireAuthenticatedUser(event)
  const body = await readBody<{ role?: string }>(event)
  const role = body?.role
  if (!role || !allowedRoles.has(role as UserRole)) {
    throw createError({ statusCode: 400, statusMessage: 'ROLE_INVALID', data: { code: 'ROLE_INVALID' } })
  }

  const token = getCookie(event, AUTH_COOKIE)
  const result = await setSessionActiveRole(token, role as UserRole)
  if (result === 'SESSION_NOT_FOUND') {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_REQUIRED', data: { code: 'AUTH_REQUIRED' } })
  }
  if (result === 'ROLE_NOT_AUTHORIZED') {
    throw createError({ statusCode: 403, statusMessage: 'ROLE_NOT_AUTHORIZED', data: { code: 'ROLE_NOT_AUTHORIZED' } })
  }

  const user = await getSessionUser(token)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_REQUIRED', data: { code: 'AUTH_REQUIRED' } })
  }
  return { user }
})
