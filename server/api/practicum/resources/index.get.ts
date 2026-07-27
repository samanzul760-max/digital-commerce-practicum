import { createError, defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { listResources } from '../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const result = listResources(requireAuthenticatedUser(event), {
    page: Math.max(1, Number(query.page) || 1),
    pageSize: Math.min(50, Math.max(1, Number(query.pageSize) || 10)),
    keyword: String(query.keyword ?? ''),
    kind: ['LINK', 'DOCUMENT', 'VIDEO'].includes(String(query.kind)) ? String(query.kind) as 'LINK' | 'DOCUMENT' | 'VIDEO' : undefined,
  })
  if ('forbidden' in result) throw createError({ statusCode: 403, statusMessage: 'RESOURCE_FORBIDDEN', data: { code: 'RESOURCE_FORBIDDEN' } })
  return result
})
