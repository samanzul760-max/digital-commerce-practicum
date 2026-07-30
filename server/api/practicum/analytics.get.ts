import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../utils/auth-session'
import { getAnalytics } from '../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const roomId = String(getQuery(event).roomId ?? '')
  const analytics = getAnalytics(requireAuthenticatedUser(event), roomId)
  if (!analytics) throw createError({ statusCode: 403, statusMessage: 'ANALYTICS_FORBIDDEN', data: { code: 'ANALYTICS_FORBIDDEN' } })
  return analytics
})
