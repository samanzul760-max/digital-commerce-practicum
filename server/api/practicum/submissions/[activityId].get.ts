import { createError, defineEventHandler } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { getSubmission } from '../../../utils/practicum-repository'

export default defineEventHandler(event => {
  const result = getSubmission(requireAuthenticatedUser(event), String(event.context.params?.activityId ?? ''))
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'SUBMISSION_FORBIDDEN', data: { code: 'SUBMISSION_FORBIDDEN' } })
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'SUBMISSION_NOT_FOUND', data: { code: 'SUBMISSION_NOT_FOUND' } })
  return result
})
