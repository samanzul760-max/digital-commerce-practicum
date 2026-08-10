import { defineEventHandler, getQuery } from 'h3'
import { listWorkOrders } from '../../../services/work-orders'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  return { tasks: await listWorkOrders(requireAdmin(event), typeof query.status === 'string' ? query.status : undefined) }
})
