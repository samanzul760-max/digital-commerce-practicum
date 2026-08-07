import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3'
import { createCompetition } from '../../../services/template-competition'
import { requireAuthenticatedUser } from '../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ roomId?: string; title?: string; description?: string }>(event)
  const result = await createCompetition(requireAuthenticatedUser(event), {
    roomId: body?.roomId?.trim() ?? '',
    title: body?.title?.trim() ?? '',
    description: body?.description?.trim() ?? '',
  })
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'COMPETITION_NOT_FOUND', data: { code: 'COMPETITION_NOT_FOUND' } })
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'COMPETITION_FORBIDDEN', data: { code: 'COMPETITION_FORBIDDEN' } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'COMPETITION_VALIDATION', data: { code: 'COMPETITION_VALIDATION' } })
  setResponseStatus(event, 201)
  return { competition: result.competition }
})
