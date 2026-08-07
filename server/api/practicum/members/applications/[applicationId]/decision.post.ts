import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { decideJoinApplication } from '../../../../../services/member-lifecycle'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ roomId?: string; decision?: 'APPROVED' | 'REJECTED' }>(event)
  return await decideJoinApplication(requireAuthenticatedUser(event), {
    ...body,
    applicationId: getRouterParam(event, 'applicationId'),
  })
})
