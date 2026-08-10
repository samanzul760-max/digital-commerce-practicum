import { createError, type H3Event } from 'h3'
import { requireAuthenticatedUser } from './auth-session'

export function requireAdmin(event: H3Event) {
  const user = requireAuthenticatedUser(event)
  if (user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'ADMIN_REQUIRED', data: { code: 'ADMIN_REQUIRED' } })
  }
  return user
}

export function requireStudent(event: H3Event) {
  const user = requireAuthenticatedUser(event)
  if (user.role !== 'STUDENT') {
    throw createError({ statusCode: 403, statusMessage: 'STUDENT_REQUIRED', data: { code: 'STUDENT_REQUIRED' } })
  }
  return user
}

export function requireRoomScope(roomIds: string[], roomId: string) {
  if (!roomId || !roomIds.includes(roomId)) {
    throw createError({ statusCode: 403, statusMessage: 'ROOM_SCOPE_FORBIDDEN', data: { code: 'ROOM_SCOPE_FORBIDDEN' } })
  }
}
