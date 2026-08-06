import { defineEventHandler } from 'h3'
import { prisma } from '../../../db/client'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { unlockDependentTasks } from '../../../services/task-unlock'
export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const now = new Date()
  const items = await prisma.$transaction(async tx => {
    const assignmentIds = await tx.studentTask.findMany({ where: { studentId: user.id, status: 'LOCKED' }, distinct: ['planAssignmentId'], select: { planAssignmentId: true } })
    for (const assignment of assignmentIds) await unlockDependentTasks(tx, { planAssignmentId: assignment.planAssignmentId, studentId: user.id, now })

    return await tx.studentTask.findMany({ where: { studentId: user.id }, include: { planAssignment: { include: { class: { include: { cohort: true } } } } }, orderBy: { availableAt: 'desc' } })
  })
  return {
    items: items.map(item => ({
      id: item.id,
      planAssignmentId: item.planAssignmentId,
      activityId: item.activityId,
      status: item.status,
      availability: item.availableAt > now ? 'NOT_YET_AVAILABLE' : item.dueAt && item.dueAt < now && !item.planAssignment.lateAllowed ? 'CLOSED' : 'AVAILABLE',
      availableAt: item.availableAt,
      dueAt: item.dueAt,
      source: {
        id: item.planAssignment.id,
        title: item.planAssignment.title,
        status: item.planAssignment.status,
      },
    })),
  }
})
