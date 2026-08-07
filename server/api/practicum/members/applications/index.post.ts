import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { createJoinApplication } from '../../../../services/member-lifecycle'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ roomId?: string; groupName?: string; idempotencyKey?: string }>(event)
  const application = await createJoinApplication(requireAuthenticatedUser(event), body)
  setResponseStatus(event, 201)
  return { application }
})
