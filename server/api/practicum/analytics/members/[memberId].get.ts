import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { getMemberAnalyticsDetail } from '../../../../utils/practicum-repository'

export default defineEventHandler(async (event) => {
  const roomId = String(getQuery(event).roomId ?? '')
  const detail = await getMemberAnalyticsDetail(requireAuthenticatedUser(event), roomId, getRouterParam(event, 'memberId') ?? '')
  if (!detail) throw createError({ statusCode: 403, statusMessage: 'MEMBER_ANALYTICS_FORBIDDEN', data: { code: 'MEMBER_ANALYTICS_FORBIDDEN' } })
  if (detail.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'MEMBER_ANALYTICS_NOT_FOUND', data: { code: 'MEMBER_ANALYTICS_NOT_FOUND' } })
  return detail
})
