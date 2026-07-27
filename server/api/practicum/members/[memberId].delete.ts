import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { removeMember } from '../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const result = removeMember(requireAuthenticatedUser(event), getRouterParam(event, 'memberId') ?? '')
  if (result === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'MEMBER_FORBIDDEN', data: { code: 'MEMBER_FORBIDDEN' } })
  if (result === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'MEMBER_NOT_FOUND', data: { code: 'MEMBER_NOT_FOUND' } })
  return { ok: true }
})
