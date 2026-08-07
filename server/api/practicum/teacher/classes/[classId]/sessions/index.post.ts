import { defineEventHandler, getRequestHeader, getRouterParam, readBody, setResponseStatus } from 'h3'
import { writeTeachingSession, type SessionInput } from '../../../../../../services/teacher-classroom'
import { requireAuthenticatedUser } from '../../../../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const classId = getRouterParam(event, 'classId') ?? ''
  const body = await readBody<SessionInput>(event)
  const result = await writeTeachingSession(user, classId, getRequestHeader(event, 'idempotency-key'), body)
  setResponseStatus(event, body.action === 'START' && !result.replayed ? 201 : 200)
  return result
})
