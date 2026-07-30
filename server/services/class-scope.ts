import { createError } from 'h3'
import { prisma } from '../db/client'
import type { AuthUser } from '../utils/auth-store'

export async function requireClassStaff(user: AuthUser, classId: string) {
  const item = await prisma.classEnrollment.findFirst({ where: { classId, userId: user.id, active: true, role: { in: ['TEACHER', 'MENTOR', 'ASSISTANT', 'HEAD_TEACHER'] } } })
  if (!item && user.role !== 'OWNER') throw createError({ statusCode: 404, statusMessage: 'CLASS_NOT_FOUND', data: { code: 'CLASS_NOT_FOUND' } })
}
