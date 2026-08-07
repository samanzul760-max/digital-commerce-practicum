import { defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { listJoinApplications } from '../../../../services/member-lifecycle'

export default defineEventHandler(async (event) => {
  return await listJoinApplications(requireAuthenticatedUser(event), { roomId: getQuery(event).roomId })
})
