import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { updateWorkOrderDraft, type WorkOrderInput } from '../../../../services/work-orders'
import { requireAdmin } from '../../../../utils/authorization'

export default defineEventHandler(async event => ({
  task: await updateWorkOrderDraft(
    requireAdmin(event),
    getRouterParam(event, 'taskId') ?? '',
    await readBody<WorkOrderInput>(event),
  ),
}))
