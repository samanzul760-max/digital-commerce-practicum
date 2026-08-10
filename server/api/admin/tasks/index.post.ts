import { defineEventHandler, getHeader, getRequestURL, readBody, setResponseStatus } from 'h3'
import { createWorkOrder, type WorkOrderInput } from '../../../services/work-orders'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async (event) => {
  const result = await createWorkOrder(
    requireAdmin(event),
    getRequestURL(event).pathname,
    getHeader(event, 'idempotency-key') ?? '',
    await readBody<WorkOrderInput>(event),
  )
  setResponseStatus(event, result.replayed ? 200 : 201)
  return result
})
