import { defineEventHandler, getHeader, getRequestURL, readBody, setResponseStatus } from 'h3'
import { createWorkOrderTemplate } from '../../../services/work-orders'
import { requireAdmin } from '../../../utils/authorization'

interface TemplateInput {
  taskId?: unknown
  title?: unknown
  description?: unknown
}

export default defineEventHandler(async (event) => {
  const result = await createWorkOrderTemplate(requireAdmin(event), getRequestURL(event).pathname, getHeader(event, 'idempotency-key') ?? '', await readBody<TemplateInput>(event))
  setResponseStatus(event, result.replayed ? 200 : 201)
  return result
})
