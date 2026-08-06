import { createError, defineEventHandler, getRouterParam } from 'h3'
import { prisma } from '../../../../db/client'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const task = await prisma.studentTask.findFirst({
    where: { id: getRouterParam(event, 'taskId') ?? '', studentId: user.id },
    include: { planAssignment: true, submissions: { include: { versions: { orderBy: { version: 'desc' } }, grade: true } } },
  })
  if (!task) throw createError({ statusCode: 404, statusMessage: 'TASK_NOT_FOUND', data: { code: 'TASK_NOT_FOUND' } })
  const now = new Date()
  const availability = task.availableAt > now ? 'NOT_YET_AVAILABLE' : task.dueAt && task.dueAt < now && !task.planAssignment.lateAllowed ? 'CLOSED' : 'AVAILABLE'
  return {
    task: {
      id: task.id,
      activityId: task.activityId,
      status: task.status,
      availability,
      availableAt: task.availableAt,
      dueAt: task.dueAt,
      activity: { id: task.activityId },
      source: { id: task.planAssignment.id, title: task.planAssignment.title, status: task.planAssignment.status },
    },
    submission: task.submissions[0] ?? null,
  }
})
