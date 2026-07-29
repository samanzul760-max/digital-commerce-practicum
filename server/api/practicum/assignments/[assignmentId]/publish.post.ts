import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { publishAssignment } from '../../../../utils/practicum-repository'

export default defineEventHandler(event => {
  const result = publishAssignment(requireAuthenticatedUser(event), getRouterParam(event, 'assignmentId') ?? '')
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'ASSIGNMENT_FORBIDDEN', data: { code: 'ASSIGNMENT_FORBIDDEN' } })
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'ASSIGNMENT_NOT_FOUND', data: { code: 'ASSIGNMENT_NOT_FOUND' } })
  if (result.kind === 'STATE') throw createError({ statusCode: 409, statusMessage: 'ASSIGNMENT_STATE_INVALID', data: { code: 'ASSIGNMENT_STATE_INVALID' } })
  return { assignment: result.assignment }
})
