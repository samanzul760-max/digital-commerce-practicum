import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { removeRoomMember } from '../../../services/room-members'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  if (user.role !== 'OWNER') throw createError({ statusCode: 403, statusMessage: 'MEMBER_FORBIDDEN', data: { code: 'MEMBER_FORBIDDEN' } })
  const result = await removeRoomMember(String(getQuery(event).roomId ?? 'room-001'), getRouterParam(event, 'memberId') ?? '')
  if (!result) throw createError({ statusCode: 404, statusMessage: 'MEMBER_NOT_FOUND', data: { code: 'MEMBER_NOT_FOUND' } })
  return { ok: true }
})
