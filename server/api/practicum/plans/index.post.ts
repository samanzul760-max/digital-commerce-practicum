import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { createPlan } from '../../../utils/practicum-repository'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  if (user.role !== 'OWNER') throw createError({ statusCode: 403, statusMessage: 'PLAN_FORBIDDEN', data: { code: 'PLAN_FORBIDDEN' } })
  const body = await readBody<{ roomId?: string; title?: string; description?: string }>(event)
  const title = body?.title?.trim() ?? ''
  const description = body?.description?.trim() ?? ''
  const roomId = body?.roomId?.trim() ?? ''
  if (!title || !description || !roomId || !user.roomIds.includes(roomId)) {
    throw createError({ statusCode: 422, statusMessage: 'PLAN_VALIDATION', data: { code: 'PLAN_VALIDATION' } })
  }
  const rawKey = event.node.req.headers['idempotency-key']
  const result = createPlan(user, { roomId, title, description }, Array.isArray(rawKey) ? rawKey[0] : rawKey)
  setResponseStatus(event, result.replayed ? 200 : 201)
  return result
})
