import { createError, defineEventHandler, readBody, getHeader, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { submitPractice } from '../../../utils/practicum-repository'

export default defineEventHandler(async event => {
  const body = await readBody<{ activityId?: string; text?: string }>(event)
  const result = submitPractice(requireAuthenticatedUser(event), { activityId: String(body?.activityId ?? ''), text: String(body?.text ?? '') }, getHeader(event, 'idempotency-key'))
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'SUBMISSION_FORBIDDEN', data: { code: 'SUBMISSION_FORBIDDEN' } })
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'ACTIVITY_NOT_FOUND', data: { code: 'ACTIVITY_NOT_FOUND' } })
  if (result.kind === 'STATE') throw createError({ statusCode: 409, statusMessage: 'SUBMISSION_STATE_INVALID', data: { code: 'SUBMISSION_STATE_INVALID' } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'SUBMISSION_TEXT_REQUIRED', data: { code: 'SUBMISSION_TEXT_REQUIRED' } })
  setResponseStatus(event, 201)
  return result
})
