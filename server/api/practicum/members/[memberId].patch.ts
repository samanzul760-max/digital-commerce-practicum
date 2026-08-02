import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { updateRoomMember } from '../../../services/room-members'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  if (user.role !== 'OWNER') throw createError({ statusCode: 403, statusMessage: 'MEMBER_FORBIDDEN', data: { code: 'MEMBER_FORBIDDEN' } })
  const body = await readBody<{ roomId?: string; group?: string; role?: 'OWNER' | 'STUDENT' }>(event)
  const member = await updateRoomMember(body.roomId ?? 'room-001', getRouterParam(event, 'memberId') ?? '', body)
  if (!member) throw createError({ statusCode: 404, statusMessage: 'MEMBER_NOT_FOUND', data: { code: 'MEMBER_NOT_FOUND' } })
  return { member }
})
