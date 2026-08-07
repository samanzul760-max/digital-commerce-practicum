import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { revokeMemberInvite } from '../../../../../services/member-lifecycle'

export default defineEventHandler(async (event) => {
  const invite = await revokeMemberInvite(requireAuthenticatedUser(event), {
    roomId: getQuery(event).roomId,
    inviteId: getRouterParam(event, 'inviteId'),
  })
  return { invite }
})
