import { createError, defineEventHandler, getCookie, getRouterParam } from 'h3'
import { AUTH_COOKIE, getSessionContext } from '../../../utils/auth-store'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { listNotifications, markNotificationRead } from '../../../utils/practicum-repository'
import { recordRoomAuditEvent, resolveCurrentRoomId } from '../../../services/resource-observability'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const notificationId = getRouterParam(event, 'notificationId') ?? ''
  const roomId = resolveCurrentRoomId(user, getSessionContext(getCookie(event, AUTH_COOKIE))?.roomId)
  if (!roomId) throw createError({ statusCode: 403, statusMessage: 'NOTIFICATION_ROOM_FORBIDDEN', data: { code: 'NOTIFICATION_ROOM_FORBIDDEN' } })
  if (!listNotifications(user).items.some(notification => notification.id === notificationId)) {
    throw createError({ statusCode: 404, statusMessage: 'NOTIFICATION_NOT_FOUND', data: { code: 'NOTIFICATION_NOT_FOUND' } })
  }
  await recordRoomAuditEvent({
    user,
    roomId,
    entityType: 'Notification',
    entityId: notificationId,
    eventType: 'NOTIFICATION_READ',
    metadata: { notificationId },
  })
  if (!markNotificationRead(user, notificationId)) throw createError({ statusCode: 404, statusMessage: 'NOTIFICATION_NOT_FOUND', data: { code: 'NOTIFICATION_NOT_FOUND' } })
  return { ok: true }
})
