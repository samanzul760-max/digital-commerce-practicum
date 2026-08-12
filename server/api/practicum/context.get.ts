import { createError, defineEventHandler, getCookie } from 'h3'
import { AUTH_COOKIE, getSessionContext } from '../../utils/auth-store'
import { requireAuthenticatedUser } from '../../utils/auth-session'
import { getWorkspaceContext } from '../../utils/practicum-repository'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const context = getWorkspaceContext(user, (await getSessionContext(getCookie(event, AUTH_COOKIE))) ?? undefined)
  if (!context) {
    throw createError({ statusCode: 403, statusMessage: 'WORKSPACE_FORBIDDEN', data: { code: 'WORKSPACE_FORBIDDEN' } })
  }
  return { user, ...context }
})
