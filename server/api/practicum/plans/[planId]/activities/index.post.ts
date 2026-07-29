import { createError, defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { createCustomActivity } from '../../../../../utils/practicum-repository'
import type { ActivityType } from '../../../../../../domain/practicum/types'

export default defineEventHandler(async (event) => {
  const planId = getRouterParam(event, 'planId') ?? ''
  const body = await readBody<{ parentId?: string; title?: string; type?: ActivityType; version?: number }>(event)
  const rawKey = event.node.req.headers['idempotency-key']
  const result = createCustomActivity(requireAuthenticatedUser(event), planId, body ?? {}, Array.isArray(rawKey) ? rawKey[0] : rawKey)

  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'PLAN_NOT_FOUND', data: { code: 'PLAN_NOT_FOUND' } })
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'PLAN_FORBIDDEN', data: { code: 'PLAN_FORBIDDEN' } })
  if (result.kind === 'STATE') throw createError({ statusCode: 409, statusMessage: 'PLAN_STATE_INVALID', data: { code: 'PLAN_STATE_INVALID' } })
  if (result.kind === 'CONFLICT') throw createError({ statusCode: 409, statusMessage: 'PLAN_VERSION_CONFLICT', data: { code: 'PLAN_VERSION_CONFLICT', currentVersion: result.currentVersion } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'PLAN_VALIDATION', data: { code: 'PLAN_VALIDATION' } })

  setResponseStatus(event, result.replayed ? 200 : 201)
  return { plan: result.plan, nodes: result.nodes, activities: result.activities, resources: result.resources }
})
