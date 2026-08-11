import { createError, defineEventHandler, getRouterParam } from 'h3'
import { prisma } from '../../../../db/client'
import { requireStudent } from '../../../../utils/authorization'
import { studentTaskScopeWhere } from '../../../../services/student-task-scope'
import { studentSubmissionView } from '../../../../services/grade-visibility'

export default defineEventHandler(async (event) => {
  const user = requireStudent(event)
  const task = await prisma.studentTask.findFirst({
    where: await studentTaskScopeWhere(user, prisma, { id: getRouterParam(event, 'taskId') ?? '' }),
    include: { planAssignment: true, submissions: { include: { versions: { orderBy: { version: 'desc' } }, grade: true } } },
  })
  if (!task) throw createError({ statusCode: 404, statusMessage: 'TASK_NOT_FOUND', data: { code: 'TASK_NOT_FOUND' } })
  const returnedEvent = await prisma.taskEvent.findFirst({
    where: { studentTaskId: task.id, eventType: 'RETURNED' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, payload: true },
  })
  const returnedFeedback = typeof returnedEvent?.payload === 'object' && returnedEvent.payload !== null && typeof (returnedEvent.payload as { feedback?: unknown }).feedback === 'string'
    ? { feedback: (returnedEvent.payload as { feedback: string }).feedback, returnedAt: returnedEvent.createdAt }
    : null
  const now = new Date()
  const availability = task.availableAt > now ? 'NOT_YET_AVAILABLE' : task.dueAt && task.dueAt < now && !task.planAssignment.lateAllowed ? 'CLOSED' : 'AVAILABLE'
  return {
    task: {
      id: task.id,
      planId: task.planAssignment.planId,
      activityId: task.activityId,
      status: task.status,
      availability,
      availableAt: task.availableAt,
      dueAt: task.dueAt,
      activity: { id: task.activityId, title: task.activityId },
      source: { id: task.planAssignment.id, title: task.planAssignment.title, status: task.planAssignment.status },
    },
    submission: studentSubmissionView(task.submissions[0]),
    returnedFeedback,
  }
})
