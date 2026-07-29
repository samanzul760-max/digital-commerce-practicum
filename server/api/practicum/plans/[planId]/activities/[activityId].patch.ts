import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { updateActivity } from '../../../../../utils/practicum-repository'

export default defineEventHandler(async (event) => {
  const result = updateActivity(requireAuthenticatedUser(event), getRouterParam(event, 'planId') ?? '', getRouterParam(event, 'activityId') ?? '', await readBody(event))
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'ACTIVITY_NOT_FOUND', data: { code: 'ACTIVITY_NOT_FOUND' } })
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'PLAN_FORBIDDEN', data: { code: 'PLAN_FORBIDDEN' } })
  if (result.kind === 'STATE') throw createError({ statusCode: 409, statusMessage: 'PLAN_STATE_INVALID', data: { code: 'PLAN_STATE_INVALID' } })
  if (result.kind === 'CONFLICT') throw createError({ statusCode: 409, statusMessage: 'PLAN_VERSION_CONFLICT', data: { code: 'PLAN_VERSION_CONFLICT', currentVersion: result.currentVersion } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'ACTIVITY_VALIDATION', data: { code: 'ACTIVITY_VALIDATION' } })
  return { plan: result.plan, nodes: result.nodes, activities: result.activities, resources: result.resources }
})
