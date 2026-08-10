import { defineEventHandler, getHeader, getRequestURL, getRouterParam, readBody, setResponseStatus } from 'h3'
import { publishWorkOrder } from '../../../../services/work-orders'
import { requireAdmin } from '../../../../utils/authorization'

interface PublishInput {
  classId?: unknown
  availableAt?: unknown
  dueAt?: unknown
  lateAllowed?: unknown
}

export default defineEventHandler(async (event) => {
  const result = await publishWorkOrder(
    requireAdmin(event),
    getRouterParam(event, 'taskId') ?? '',
    getRequestURL(event).pathname,
    getHeader(event, 'idempotency-key') ?? '',
    await readBody<PublishInput>(event),
  )
  setResponseStatus(event, result.replayed ? 200 : 201)
  return result
})
