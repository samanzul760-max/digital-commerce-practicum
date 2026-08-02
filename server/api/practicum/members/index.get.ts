import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { listRoomMembers } from '../../../services/room-members'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const user = requireAuthenticatedUser(event)
  if (user.role !== 'OWNER') throw createError({ statusCode: 403, statusMessage: 'MEMBER_FORBIDDEN', data: { code: 'MEMBER_FORBIDDEN' } })
  return await listRoomMembers(String(query.roomId ?? 'room-001'), { page: Math.max(1, Number(query.page) || 1), pageSize: Math.min(50, Math.max(1, Number(query.pageSize) || 10)), keyword: String(query.keyword ?? '') })
})
