import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { deleteResource } from '../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const result = deleteResource(requireAuthenticatedUser(event), getRouterParam(event, 'resourceId') ?? '')
  if (result === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'RESOURCE_FORBIDDEN', data: { code: 'RESOURCE_FORBIDDEN' } })
  if (result === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'RESOURCE_NOT_FOUND', data: { code: 'RESOURCE_NOT_FOUND' } })
  return { ok: true }
})
