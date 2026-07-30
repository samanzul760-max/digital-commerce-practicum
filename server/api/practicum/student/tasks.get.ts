import { defineEventHandler } from 'h3'
import { prisma } from '../../../db/client'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const now = new Date()
  const items = await prisma.studentTask.findMany({ where: { studentId: user.id }, include: { planAssignment: { include: { class: { include: { cohort: true } } } } }, orderBy: { availableAt: 'asc' } })
  return { items: items.map(item => ({ ...item, availability: item.availableAt > now ? 'NOT_YET_AVAILABLE' : item.dueAt && item.dueAt < now && !item.planAssignment.lateAllowed ? 'CLOSED' : 'AVAILABLE' })) }
})
