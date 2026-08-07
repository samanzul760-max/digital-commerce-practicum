import { defineEventHandler, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { cancelJoinApplication } from '../../../../../services/member-lifecycle'

export default defineEventHandler(async (event) => {
  const application = await cancelJoinApplication(requireAuthenticatedUser(event), { applicationId: getRouterParam(event, 'applicationId') })
  return { application }
})
