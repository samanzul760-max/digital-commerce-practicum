import { defineEventHandler, getHeader, getRequestURL, getRouterParam, readBody, setResponseStatus } from 'h3'
import { copyWorkOrderTemplate } from '../../../../services/work-orders'
import { requireAdmin } from '../../../../utils/authorization'

interface CopyInput {
  classId?: unknown
  title?: unknown
}

export default defineEventHandler(async (event) => {
  const result = await copyWorkOrderTemplate(
    requireAdmin(event),
    getRequestURL(event).pathname,
    getHeader(event, 'idempotency-key') ?? '',
    getRouterParam(event, 'templateId') ?? '',
    await readBody<CopyInput>(event),
  )
  setResponseStatus(event, result.replayed ? 200 : 201)
  return result
})
