import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { prisma } from '../../../../../db/client'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { requireClassStaff } from '../../../../../services/class-scope'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const feedback = (await readBody<{ feedback?: string }>(event))?.feedback?.trim() ?? ''
  const task = await prisma.studentTask.findUnique({
    where: { id: getRouterParam(event, 'taskId') ?? '' },
    include: { planAssignment: true, submissions: true },
  })
  if (!task || !task.submissions[0]) throw createError({ statusCode: 404, statusMessage: 'SUBMISSION_NOT_FOUND', data: { code: 'SUBMISSION_NOT_FOUND' } })
  await requireClassStaff(user, task.planAssignment.classId)
  if (!feedback) throw createError({ statusCode: 422, statusMessage: 'RETURN_FEEDBACK_REQUIRED', data: { code: 'RETURN_FEEDBACK_REQUIRED' } })
  if (task.status !== 'SUBMITTED') throw createError({ statusCode: 409, statusMessage: 'TASK_STATE_INVALID', data: { code: 'TASK_STATE_INVALID' } })

  const updated = await prisma.$transaction(async (transaction) => {
    const nextTask = await transaction.studentTask.update({ where: { id: task.id }, data: { status: 'RETURNED' } })
    await transaction.taskEvent.create({ data: { studentTaskId: task.id, eventType: 'RETURNED', payload: { feedback, actorId: user.id } } })
    return nextTask
  })
  return { task: { id: updated.id, status: updated.status } }
})
