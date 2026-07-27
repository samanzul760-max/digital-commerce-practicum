import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { transitionPlan } from '../../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const result = transitionPlan(requireAuthenticatedUser(event), getRouterParam(event, 'planId') ?? '', 'archive')
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'PLAN_NOT_FOUND', data: { code: 'PLAN_NOT_FOUND' } })
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'PLAN_FORBIDDEN', data: { code: 'PLAN_FORBIDDEN' } })
  if (result.kind === 'STATE') throw createError({ statusCode: 409, statusMessage: 'PLAN_STATE_INVALID', data: { code: 'PLAN_STATE_INVALID' } })
  return result
})
