import { createError, defineEventHandler, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { returnSubmission } from '../../../../utils/practicum-repository'

export default defineEventHandler(async event => {
  const body = await readBody<{ feedback?: string }>(event)
  const result = returnSubmission(requireAuthenticatedUser(event), String(event.context.params?.activityId ?? ''), String(body?.feedback ?? ''))
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'SUBMISSION_FORBIDDEN', data: { code: 'SUBMISSION_FORBIDDEN' } })
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'SUBMISSION_NOT_FOUND', data: { code: 'SUBMISSION_NOT_FOUND' } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'RETURN_FEEDBACK_REQUIRED', data: { code: 'RETURN_FEEDBACK_REQUIRED' } })
  return result
})
