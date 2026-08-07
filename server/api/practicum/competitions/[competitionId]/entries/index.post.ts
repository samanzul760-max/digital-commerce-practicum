import { createError, defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { enterCompetition } from '../../../../../services/template-competition'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const result = await enterCompetition(requireAuthenticatedUser(event), getRouterParam(event, 'competitionId') ?? '')
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'COMPETITION_NOT_FOUND', data: { code: 'COMPETITION_NOT_FOUND' } })
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'COMPETITION_FORBIDDEN', data: { code: 'COMPETITION_FORBIDDEN' } })
  if (result.kind === 'STATE') throw createError({ statusCode: 409, statusMessage: 'COMPETITION_STATE_INVALID', data: { code: 'COMPETITION_STATE_INVALID' } })
  if (result.kind === 'EXISTS') throw createError({ statusCode: 409, statusMessage: 'COMPETITION_ENTRY_EXISTS', data: { code: 'COMPETITION_ENTRY_EXISTS' } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'COMPETITION_ENTRY_VALIDATION', data: { code: 'COMPETITION_ENTRY_VALIDATION' } })
  setResponseStatus(event, 201)
  return { entry: result.entry }
})
