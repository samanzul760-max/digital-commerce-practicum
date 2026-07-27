import { defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { listPlans } from '../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  const user = requireAuthenticatedUser(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10))
  const status = ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(String(query.status)) ? String(query.status) as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' : undefined
  const sort = ['createdAt', 'updatedAt', 'title'].includes(String(query.sort)) ? String(query.sort) as 'createdAt' | 'updatedAt' | 'title' : 'updatedAt'
  const direction = query.direction === 'asc' ? 'asc' : 'desc'
  return listPlans(user, { page, pageSize, keyword: String(query.keyword ?? ''), status, sort, direction })
})
