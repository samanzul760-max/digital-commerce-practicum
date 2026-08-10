import { defineEventHandler, getRouterParam } from 'h3'
import { getWorkOrder } from '../../../../services/work-orders'
import { requireAdmin } from '../../../../utils/authorization'

export default defineEventHandler(async event => ({
  task: await getWorkOrder(requireAdmin(event), getRouterParam(event, 'taskId') ?? ''),
}))
