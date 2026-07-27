import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { updateMember } from '../../../utils/practicum-repository'

export default defineEventHandler(async (event) => {
  const result = updateMember(requireAuthenticatedUser(event), getRouterParam(event, 'memberId') ?? '', await readBody(event))
  if (result === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'MEMBER_FORBIDDEN', data: { code: 'MEMBER_FORBIDDEN' } })
  if (result === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'MEMBER_NOT_FOUND', data: { code: 'MEMBER_NOT_FOUND' } })
  return result
})
