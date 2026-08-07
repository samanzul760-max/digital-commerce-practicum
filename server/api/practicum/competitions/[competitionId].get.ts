import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getCompetition } from '../../../services/template-competition'
import { requireAuthenticatedUser } from '../../../utils/auth-session'

export default defineEventHandler((event) => {
  const result = getCompetition(requireAuthenticatedUser(event), getRouterParam(event, 'competitionId') ?? '')
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'COMPETITION_NOT_FOUND', data: { code: 'COMPETITION_NOT_FOUND' } })
  if (result.kind === 'UNAVAILABLE') throw createError({ statusCode: 403, statusMessage: 'COMPETITION_UNAVAILABLE', data: { code: 'COMPETITION_UNAVAILABLE' } })
  return result
})
