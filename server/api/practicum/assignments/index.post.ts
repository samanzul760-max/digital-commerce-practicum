import { createError, defineEventHandler, getHeader, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { createAssignment } from '../../../utils/practicum-repository'

export default defineEventHandler(async event => {
  const body = await readBody<{ planId?: string; title?: string; instructions?: string; audience?: 'ALL_STUDENTS' | 'GROUP'; groupId?: string }>(event)
  const result = createAssignment(requireAuthenticatedUser(event), {
    planId: String(body?.planId ?? ''), title: String(body?.title ?? ''), instructions: String(body?.instructions ?? ''), audience: body?.audience === 'GROUP' ? 'GROUP' : 'ALL_STUDENTS', groupId: body?.groupId,
  }, getHeader(event, 'idempotency-key'))
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'ASSIGNMENT_FORBIDDEN', data: { code: 'ASSIGNMENT_FORBIDDEN' } })
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'PLAN_NOT_FOUND', data: { code: 'PLAN_NOT_FOUND' } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'ASSIGNMENT_VALIDATION', data: { code: 'ASSIGNMENT_VALIDATION' } })
  setResponseStatus(event, result.replayed ? 200 : 201)
  return { assignment: result.assignment }
})
