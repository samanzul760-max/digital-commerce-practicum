import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { listSubmissions } from '../../../utils/practicum-repository'

export default defineEventHandler(event => {
  const query = getQuery(event)
  const result = listSubmissions(requireAuthenticatedUser(event), {
    status: query.status ? String(query.status) : undefined,
    planId: query.planId ? String(query.planId).trim() : undefined,
    unitId: query.unitId ? String(query.unitId).trim() : undefined,
    student: query.student ? String(query.student).trim() : undefined,
    sort: query.sort === 'newest' ? 'newest' : 'oldest',
    page: Math.max(1, Number(query.page) || 1),
    pageSize: Math.min(50, Math.max(1, Number(query.pageSize) || 20)),
  })
  if ('forbidden' in result) throw createError({ statusCode: 403, statusMessage: 'SUBMISSION_FORBIDDEN', data: { code: 'SUBMISSION_FORBIDDEN' } })
  return result
})
