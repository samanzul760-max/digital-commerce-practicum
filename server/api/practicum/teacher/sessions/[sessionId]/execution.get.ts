import { defineEventHandler, getRouterParam } from 'h3'
import { getTeachingExecution } from '../../../../../services/teacher-classroom'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const sessionId = getRouterParam(event, 'sessionId') ?? ''
  return await getTeachingExecution(user, sessionId)
})
