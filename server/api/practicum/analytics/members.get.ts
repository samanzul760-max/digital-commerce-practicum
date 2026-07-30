import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { getMemberAnalytics } from '../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const roomId = String(getQuery(event).roomId ?? '')
  const analytics = getMemberAnalytics(requireAuthenticatedUser(event), roomId)
  if (!analytics) throw createError({ statusCode: 403, statusMessage: 'MEMBER_ANALYTICS_FORBIDDEN', data: { code: 'MEMBER_ANALYTICS_FORBIDDEN' } })
  return analytics
})
