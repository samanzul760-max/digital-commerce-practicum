import { createError, defineEventHandler, getCookie, getRouterParam, readBody } from 'h3'
import { AUTH_COOKIE, setSessionContext } from '../../../../utils/auth-store'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { canSelectWorkspaceContext, getWorkspaceContext } from '../../../../utils/practicum-repository'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const organizationId = getRouterParam(event, 'organizationId')?.trim() ?? ''
  const body = await readBody<{ roomId?: string }>(event)
  const roomId = body?.roomId?.trim() ?? ''
  if (!organizationId || !roomId || !canSelectWorkspaceContext(user, { organizationId, roomId })) {
    throw createError({ statusCode: 403, statusMessage: 'WORKSPACE_FORBIDDEN', data: { code: 'WORKSPACE_FORBIDDEN' } })
  }
  if (!setSessionContext(getCookie(event, AUTH_COOKIE), { organizationId, roomId })) {
    throw createError({ statusCode: 401, statusMessage: 'AUTH_REQUIRED', data: { code: 'AUTH_REQUIRED' } })
  }
  return getWorkspaceContext(user, { organizationId, roomId })
})
