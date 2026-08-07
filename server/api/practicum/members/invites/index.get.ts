import { defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { listMemberInvites } from '../../../../services/member-lifecycle'

export default defineEventHandler(async (event) => {
  return await listMemberInvites(requireAuthenticatedUser(event), { roomId: getQuery(event).roomId })
})
