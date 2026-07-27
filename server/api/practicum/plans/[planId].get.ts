import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { getPlan } from '../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const result = getPlan(requireAuthenticatedUser(event), getRouterParam(event, 'planId') ?? '')
  if (!result) throw createError({ statusCode: 404, statusMessage: 'PLAN_NOT_FOUND', data: { code: 'PLAN_NOT_FOUND' } })
  if ('forbidden' in result) throw createError({ statusCode: 403, statusMessage: 'PLAN_FORBIDDEN', data: { code: 'PLAN_FORBIDDEN' } })
  return result
})
