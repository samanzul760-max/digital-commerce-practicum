import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { createMemberInvite } from '../../../../services/member-lifecycle'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ roomId?: string; invitee?: string; groupName?: string; expiresAt?: string; idempotencyKey?: string }>(event)
  const invite = await createMemberInvite(requireAuthenticatedUser(event), body)
  setResponseStatus(event, 201)
  return { invite }
})
