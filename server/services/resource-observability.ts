import type { Prisma } from '@prisma/client'
import type { AuthUser } from '../utils/auth-store'
import { prisma } from '../db/client'
import { getAnalytics, getStats } from '../utils/practicum-repository'

const MAX_AUDIT_LIMIT = 100

export function canInspectRoom(user: AuthUser, roomId: string) {
  return Boolean(roomId) && user.role === 'OWNER' && user.roomIds.includes(roomId)
}

export function resolveCurrentRoomId(user: AuthUser, selectedRoomId?: string) {
  if (selectedRoomId && user.roomIds.includes(selectedRoomId)) return selectedRoomId
  return user.roomIds[0] ?? null
}

export async function getRoomOverview(user: AuthUser, roomId: string) {
  if (!canInspectRoom(user, roomId)) return null

  const analytics = getAnalytics(user, roomId)
  const stats = getStats(user, roomId)
  if (!analytics || !stats) return null

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [total, recent] = await prisma.$transaction([
    prisma.auditEvent.count({ where: { trainingRoomId: roomId, occurredAt: { gte: since } } }),
    prisma.auditEvent.findMany({
      where: { trainingRoomId: roomId },
      orderBy: { occurredAt: 'desc' },
      take: 10,
      select: { id: true, actorId: true, actorRole: true, entityType: true, entityId: true, eventType: true, occurredAt: true },
    }),
  ])

  return { analytics, stats, audit: { total, recent } }
}

export async function listRoomAuditEvents(user: AuthUser, roomId: string, input: { eventType?: string; entityType?: string; before?: Date; limit?: number }) {
  if (!canInspectRoom(user, roomId)) return null
  const limit = Math.min(MAX_AUDIT_LIMIT, Math.max(1, input.limit ?? 25))
  const where = {
    trainingRoomId: roomId,
    ...(input.eventType ? { eventType: input.eventType } : {}),
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(input.before ? { occurredAt: { lt: input.before } } : {}),
  }
  const items = await prisma.auditEvent.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: limit,
    select: { id: true, actorId: true, actorRole: true, entityType: true, entityId: true, eventType: true, metadata: true, occurredAt: true },
  })
  return { items, limit, nextBefore: items.at(-1)?.occurredAt.toISOString() ?? null }
}

export async function recordRoomAuditEvent(input: {
  user: AuthUser
  roomId: string
  entityType: string
  entityId: string
  eventType: string
  metadata?: Record<string, string | number | boolean | null>
}) {
  if (!input.roomId || !input.user.roomIds.includes(input.roomId)) return false
  await prisma.auditEvent.create({
    data: {
      trainingRoomId: input.roomId,
      actorId: input.user.id,
      actorRole: input.user.role,
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: input.eventType,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  })
  return true
}
