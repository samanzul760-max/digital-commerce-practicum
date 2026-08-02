import { defineEventHandler, getHeader, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { publishClassAssignment } from '../../../services/class-assignment'

export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const body = await readBody<{ classId?: string; planId?: string; title?: string; activityIds?: string[]; availableAt?: string; dueAt?: string; lateAllowed?: boolean }>(event)
  const idempotencyKey = getHeader(event, 'idempotency-key')?.trim() ?? ''
  const result = await publishClassAssignment(user, event.path, idempotencyKey, body ?? {})
  setResponseStatus(event, result.replayed ? 200 : 201)
  return { assignment: result.assignment, taskCount: result.taskCount }
})
