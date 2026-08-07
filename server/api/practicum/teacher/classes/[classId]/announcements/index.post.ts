import { defineEventHandler, getRequestHeader, getRouterParam, readBody, setResponseStatus } from 'h3'
import { writeTeacherAnnouncement, type AnnouncementInput } from '../../../../../../services/teacher-classroom'
import { requireAuthenticatedUser } from '../../../../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const classId = getRouterParam(event, 'classId') ?? ''
  const body = await readBody<AnnouncementInput>(event)
  const result = await writeTeacherAnnouncement(user, classId, getRequestHeader(event, 'idempotency-key'), body)
  setResponseStatus(event, !body.action && !result.replayed ? 201 : 200)
  return result
})
