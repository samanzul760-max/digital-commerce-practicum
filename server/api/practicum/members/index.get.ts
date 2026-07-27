import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { listMembers } from '../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const result = listMembers(requireAuthenticatedUser(event), { page: Math.max(1, Number(query.page) || 1), pageSize: Math.min(50, Math.max(1, Number(query.pageSize) || 10)), keyword: String(query.keyword ?? '') })
  if ('forbidden' in result) throw createError({ statusCode: 403, statusMessage: 'MEMBER_FORBIDDEN', data: { code: 'MEMBER_FORBIDDEN' } })
  return result
})
