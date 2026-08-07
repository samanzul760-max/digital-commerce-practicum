import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { getRoomOverview } from '../../../services/resource-observability'

export default defineEventHandler(async (event) => {
  const roomId = String(getQuery(event).roomId ?? '')
  const overview = await getRoomOverview(requireAuthenticatedUser(event), roomId)
  if (!overview) throw createError({ statusCode: 403, statusMessage: 'ANALYTICS_OVERVIEW_FORBIDDEN', data: { code: 'ANALYTICS_OVERVIEW_FORBIDDEN' } })
  return overview
})
