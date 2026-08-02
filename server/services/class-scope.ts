import { createError } from 'h3'
import { prisma } from '../db/client'
import type { AuthUser } from '../utils/auth-store'

export async function requireClassStaff(user: AuthUser, classId: string) {
  const classroom = await prisma.class.findUnique({ where: { id: classId } })
  if (!classroom || !user.roomIds.includes(classroom.roomId)) {
    throw createError({ statusCode: 404, statusMessage: 'CLASS_NOT_FOUND', data: { code: 'CLASS_NOT_FOUND' } })
  }
  if (user.role === 'OWNER') return classroom

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { classId, userId: user.id, active: true, role: { in: ['TEACHER', 'MENTOR', 'ASSISTANT', 'HEAD_TEACHER'] } },
  })
  if (!enrollment) throw createError({ statusCode: 404, statusMessage: 'CLASS_NOT_FOUND', data: { code: 'CLASS_NOT_FOUND' } })
  return classroom
}

export async function requireClassRoomManager(user: AuthUser, organizationId: string, roomId: string) {
  if (!['OWNER', 'TEACHER'].includes(user.role) || !user.roomIds.includes(roomId)) {
    throw createError({ statusCode: 403, statusMessage: 'CLASS_FORBIDDEN', data: { code: 'CLASS_FORBIDDEN' } })
  }

  const room = await prisma.trainingRoom.findFirst({ where: { id: roomId, organizationId } })
  if (!room) throw createError({ statusCode: 404, statusMessage: 'CLASS_SCOPE_NOT_FOUND', data: { code: 'CLASS_SCOPE_NOT_FOUND' } })
  return room
}
