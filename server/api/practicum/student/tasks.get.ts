import { defineEventHandler } from 'h3'
import { prisma } from '../../../db/client'
import { requireStudent } from '../../../utils/authorization'
import { unlockDependentTasks } from '../../../services/task-unlock'
import { studentTaskScopeWhere } from '../../../services/student-task-scope'
import { studentGradeView } from '../../../services/grade-visibility'
export default defineEventHandler(async event => {
  const user = requireStudent(event)
  const now = new Date()
  const items = await prisma.$transaction(async tx => {
    const scope = await studentTaskScopeWhere(user, tx)
    const assignmentIds = await tx.studentTask.findMany({ where: { AND: [scope, { status: 'LOCKED' }] }, distinct: ['planAssignmentId'], select: { planAssignmentId: true } })
    for (const assignment of assignmentIds) await unlockDependentTasks(tx, { planAssignmentId: assignment.planAssignmentId, studentId: user.id, now })

    return await tx.studentTask.findMany({ where: scope, include: { planAssignment: { include: { class: { include: { cohort: true } } } }, submissions: { include: { grade: true }, orderBy: { submittedAt: 'desc' } } }, orderBy: { availableAt: 'desc' } })
  })
  return {
    items: items.map(item => ({
      id: item.id,
      planAssignmentId: item.planAssignmentId,
      planId: item.planAssignment.planId,
      activityId: item.activityId,
      status: item.status,
      availability: item.availableAt > now ? 'NOT_YET_AVAILABLE' : item.dueAt && item.dueAt < now && !item.planAssignment.lateAllowed ? 'CLOSED' : 'AVAILABLE',
      availableAt: item.availableAt,
      dueAt: item.dueAt,
      activity: {
        id: item.activityId,
        title: item.activityId,
      },
      source: {
        id: item.planAssignment.id,
        title: item.planAssignment.title,
        status: item.planAssignment.status,
      },
      grade: studentGradeView(item.submissions[0]?.grade),
    })),
  }
})
