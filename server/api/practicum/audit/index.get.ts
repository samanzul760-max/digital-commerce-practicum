import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { listRoomAuditEvents } from '../../../services/resource-observability'

function parseBefore(value: unknown) {
  const date = typeof value === 'string' ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : undefined
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const result = await listRoomAuditEvents(requireAuthenticatedUser(event), String(query.roomId ?? ''), {
    eventType: typeof query.eventType === 'string' ? query.eventType : undefined,
    entityType: typeof query.entityType === 'string' ? query.entityType : undefined,
    before: parseBefore(query.before),
    limit: Math.min(100, Math.max(1, Number(query.limit) || 25)),
  })
  if (!result) throw createError({ statusCode: 403, statusMessage: 'AUDIT_FORBIDDEN', data: { code: 'AUDIT_FORBIDDEN' } })
  return result
})
