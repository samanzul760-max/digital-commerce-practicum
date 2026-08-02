import { createError, defineEventHandler, getQuery } from 'h3'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../../db/client'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { requireClassRoomManager } from '../../../services/class-scope'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const query = getQuery(event)
  const roomId = typeof query.roomId === 'string' ? query.roomId.trim() : ''
  const organizationId = typeof query.organizationId === 'string' ? query.organizationId.trim() : ''
  if (!roomId || !organizationId) {
    throw createError({ statusCode: 422, statusMessage: 'CLASS_QUERY_INVALID', data: { code: 'CLASS_QUERY_INVALID' } })
  }

  await requireClassRoomManager(user, organizationId, roomId)
  const where: Prisma.ClassWhereInput = user.role === 'OWNER'
    ? { roomId, organizationId }
    : { roomId, organizationId, enrollments: { some: { userId: user.id, active: true, role: { in: ['TEACHER', 'MENTOR', 'ASSISTANT', 'HEAD_TEACHER'] } } } }
  const items = await prisma.class.findMany({ where, include: { cohort: true, room: true }, orderBy: { name: 'asc' } })
  return { items }
})
