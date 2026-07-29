import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../../../../utils/auth-session'
import { reorderCurriculumNode } from '../../../../../../utils/practicum-repository'

export default defineEventHandler(async (event) => {
  const result = reorderCurriculumNode(requireAuthenticatedUser(event), getRouterParam(event, 'planId') ?? '', getRouterParam(event, 'nodeId') ?? '', await readBody(event))
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'PLAN_NOT_FOUND', data: { code: 'PLAN_NOT_FOUND' } })
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'PLAN_FORBIDDEN', data: { code: 'PLAN_FORBIDDEN' } })
  if (result.kind === 'STATE') throw createError({ statusCode: 409, statusMessage: 'PLAN_STATE_INVALID', data: { code: 'PLAN_STATE_INVALID' } })
  if (result.kind === 'CONFLICT') throw createError({ statusCode: 409, statusMessage: 'PLAN_VERSION_CONFLICT', data: { code: 'PLAN_VERSION_CONFLICT', currentVersion: result.currentVersion } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'NODE_REORDER_VALIDATION', data: { code: 'NODE_REORDER_VALIDATION' } })
  return { plan: result.plan, nodes: result.nodes, activities: result.activities, resources: result.resources }
})
