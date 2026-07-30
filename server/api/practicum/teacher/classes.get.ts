import { defineEventHandler } from 'h3'
import { prisma } from '../../../db/client'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  return { items: await prisma.class.findMany({ where: { enrollments: { some: { userId: user.id, active: true, role: { in: ['TEACHER', 'MENTOR', 'ASSISTANT', 'HEAD_TEACHER'] } } } }, include: { cohort: true, room: true } }) }
})
