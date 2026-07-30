import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { exportAnalyticsCsv } from '../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const roomId = String(getQuery(event).roomId ?? '')
  const csv = exportAnalyticsCsv(requireAuthenticatedUser(event), roomId)
  if (csv === null) throw createError({ statusCode: 403, statusMessage: 'ANALYTICS_EXPORT_FORBIDDEN', data: { code: 'ANALYTICS_EXPORT_FORBIDDEN' } })
  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', 'attachment; filename="practicum-analytics.csv"')
  return csv
})
