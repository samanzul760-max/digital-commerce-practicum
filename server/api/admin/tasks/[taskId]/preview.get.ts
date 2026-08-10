import { defineEventHandler, getRouterParam } from 'h3'
import { previewWorkOrder } from '../../../../services/work-orders'
import { requireAdmin } from '../../../../utils/authorization'

export default defineEventHandler(async event => ({
  task: await previewWorkOrder(requireAdmin(event), getRouterParam(event, 'taskId') ?? ''),
}))
