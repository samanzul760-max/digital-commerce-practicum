import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '~/server/utils/auth-session'
import { getCurriculumDeleteImpact } from '~/server/utils/practicum-repository'

export default defineEventHandler((event) => {
  const result = getCurriculumDeleteImpact(
    requireAuthenticatedUser(event),
    getRouterParam(event, 'planId') ?? '',
    getRouterParam(event, 'nodeId') ?? '',
  )
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'PLAN_NOT_FOUND', data: { code: 'PLAN_NOT_FOUND' } })
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'PLAN_FORBIDDEN', data: { code: 'PLAN_FORBIDDEN' } })
  return { descendantCount: result.descendantCount, activityCount: result.activityCount, evidenceCount: result.evidenceCount }
})
