import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { batchPublishPlans } from '../../../utils/practicum-repository'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const body = await readBody<{ planIds?: string[] }>(event)
  const result = batchPublishPlans(user, Array.isArray(body?.planIds) ? body.planIds : [])
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'PLAN_FORBIDDEN', data: { code: 'PLAN_FORBIDDEN' } })
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'PLAN_NOT_FOUND', data: { code: 'PLAN_NOT_FOUND' } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'PLAN_VALIDATION', data: { code: 'PLAN_VALIDATION' } })
  setResponseStatus(event, 200)
  return result
})
