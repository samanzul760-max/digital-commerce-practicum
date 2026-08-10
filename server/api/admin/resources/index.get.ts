import { defineEventHandler, getQuery } from 'h3'
import { listResourceCatalog } from '../../../services/work-orders'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const query = getQuery(event)
  return { resources: await listResourceCatalog(typeof query.source === 'string' ? query.source : undefined) }
})
