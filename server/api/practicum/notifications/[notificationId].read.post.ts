import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { markNotificationRead } from '../../../utils/practicum-repository'

export default defineEventHandler((event) => {
  if (!markNotificationRead(requireAuthenticatedUser(event), getRouterParam(event, 'notificationId') ?? '')) throw createError({ statusCode: 404, statusMessage: 'NOTIFICATION_NOT_FOUND', data: { code: 'NOTIFICATION_NOT_FOUND' } })
  return { ok: true }
})
