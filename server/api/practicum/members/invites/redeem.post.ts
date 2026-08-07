import { defineEventHandler, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { redeemMemberInvite } from '../../../../services/member-lifecycle'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ code?: string }>(event)
  return await redeemMemberInvite(requireAuthenticatedUser(event), body)
})
