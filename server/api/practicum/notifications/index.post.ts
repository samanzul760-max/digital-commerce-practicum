import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { createAdminNotification } from '../../../utils/practicum-repository'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const body = await readBody<{ title?: string; message?: string; targetRole?: 'STUDENT'; targetRoute?: string }>(event)
  const rawKey = event.node.req.headers['idempotency-key']
  const idempotencyKey = Array.isArray(rawKey) ? rawKey[0] : rawKey
  const result = createAdminNotification(user, {
    title: body?.title ?? '',
    message: body?.message ?? '',
    targetRole: body?.targetRole,
    targetRoute: body?.targetRoute,
  }, idempotencyKey)
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'NOTIFICATION_FORBIDDEN', data: { code: 'NOTIFICATION_FORBIDDEN' } })
  if (result.kind === 'VALIDATION') throw createError({ statusCode: 422, statusMessage: 'NOTIFICATION_VALIDATION', data: { code: 'NOTIFICATION_VALIDATION' } })
  setResponseStatus(event, result.replayed ? 200 : 201)
  return result
})
