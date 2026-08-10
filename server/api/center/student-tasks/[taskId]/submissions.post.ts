import { defineEventHandler, getHeader, getRequestURL, getRouterParam, setResponseStatus } from 'h3'
import { submitStudentWorkOrder } from '../../../../services/student-work-orders'
import { requireStudent } from '../../../../utils/authorization'

export default defineEventHandler(async event => {
  const result = await submitStudentWorkOrder(requireStudent(event), getRouterParam(event, 'taskId') ?? '', getHeader(event, 'idempotency-key')?.trim() ?? '', getRequestURL(event).pathname)
  setResponseStatus(event, result.replayed ? 200 : 201)
  return result
})
