import { createError, defineEventHandler, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { gradeSubmission } from '../../../../utils/practicum-repository'

export default defineEventHandler(async event => {
  const body = await readBody<{ rubricScores?: Record<string, number>; feedback?: string }>(event)
  const result = gradeSubmission(requireAuthenticatedUser(event), String(event.context.params?.activityId ?? ''), { rubricScores: body?.rubricScores ?? {}, feedback: String(body?.feedback ?? '') })
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'SUBMISSION_FORBIDDEN', data: { code: 'SUBMISSION_FORBIDDEN' } })
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'SUBMISSION_NOT_FOUND', data: { code: 'SUBMISSION_NOT_FOUND' } })
  if (result.kind === 'RUBRIC') throw createError({ statusCode: 422, statusMessage: 'RUBRIC_INVALID', data: { code: 'RUBRIC_INVALID' } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'GRADE_INVALID', data: { code: 'GRADE_INVALID' } })
  return result
})
