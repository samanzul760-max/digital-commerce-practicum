import { defineEventHandler, getHeader, getRouterParam, readBody, setResponseStatus } from 'h3'
import { publishClassAssignment } from '../../../../../services/class-assignment'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'

export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const body = await readBody<{ planId?: string; title?: string; activityIds?: string[]; availableAt?: string; dueAt?: string; lateAllowed?: boolean }>(event)
  const result = await publishClassAssignment(user, event.path, getHeader(event, 'idempotency-key')?.trim() ?? '', {
    ...body,
    classId: getRouterParam(event, 'classId') ?? '',
  })
  setResponseStatus(event, result.replayed ? 200 : 201)
  return { assignment: result.assignment, taskCount: result.taskCount }
})
