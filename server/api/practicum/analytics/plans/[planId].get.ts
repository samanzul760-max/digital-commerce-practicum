import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { getPlanAnalytics } from '../../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const result = getPlanAnalytics(requireAuthenticatedUser(event), String(getQuery(event).roomId ?? ''), getRouterParam(event, 'planId') ?? '')
  if (!result) throw createError({ statusCode: 403, statusMessage: 'PLAN_ANALYTICS_FORBIDDEN', data: { code: 'PLAN_ANALYTICS_FORBIDDEN' } })
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'PLAN_ANALYTICS_NOT_FOUND', data: { code: 'PLAN_ANALYTICS_NOT_FOUND' } })
  return result
})
