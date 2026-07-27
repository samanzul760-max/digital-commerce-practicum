import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../utils/auth-session'
import { getStats } from '../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const roomId = String(getQuery(event).roomId ?? '')
  const stats = getStats(requireAuthenticatedUser(event), roomId)
  if (!stats) throw createError({ statusCode: 403, statusMessage: 'STATS_FORBIDDEN', data: { code: 'STATS_FORBIDDEN' } })
  return { stats }
})
