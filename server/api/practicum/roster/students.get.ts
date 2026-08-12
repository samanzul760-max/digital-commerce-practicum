import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { listStudentRoster } from '../../../utils/auth-store'
import { requireClassRoomManager } from '../../../services/class-scope'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const query = getQuery(event)
  const organizationId = typeof query.organizationId === 'string' ? query.organizationId.trim() : ''
  const roomId = typeof query.roomId === 'string' ? query.roomId.trim() : ''
  if (!organizationId || !roomId) {
    throw createError({ statusCode: 422, statusMessage: 'ROSTER_QUERY_INVALID', data: { code: 'ROSTER_QUERY_INVALID' } })
  }

  await requireClassRoomManager(user, organizationId, roomId)
  return { items: await listStudentRoster(roomId) }
})
