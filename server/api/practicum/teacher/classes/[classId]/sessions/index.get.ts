import { defineEventHandler, getRouterParam } from 'h3'
import { listTeachingSessions } from '../../../../../../services/teacher-classroom'
import { requireAuthenticatedUser } from '../../../../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const classId = getRouterParam(event, 'classId') ?? ''
  return await listTeachingSessions(user, classId)
})
