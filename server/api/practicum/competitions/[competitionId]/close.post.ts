import { createError, defineEventHandler, getRouterParam } from 'h3'
import { transitionCompetition } from '../../../../services/template-competition'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const result = await transitionCompetition(requireAuthenticatedUser(event), getRouterParam(event, 'competitionId') ?? '', 'close')
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'COMPETITION_NOT_FOUND', data: { code: 'COMPETITION_NOT_FOUND' } })
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'COMPETITION_FORBIDDEN', data: { code: 'COMPETITION_FORBIDDEN' } })
  if (result.kind === 'STATE') throw createError({ statusCode: 409, statusMessage: 'COMPETITION_STATE_INVALID', data: { code: 'COMPETITION_STATE_INVALID' } })
  return { competition: result.competition }
})
