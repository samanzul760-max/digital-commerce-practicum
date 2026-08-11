import { createError, defineEventHandler, getRouterParam } from 'h3'
import { prisma } from '../../../../db/client'
import { requireStudent } from '../../../../utils/authorization'
import { getPlan } from '../../../../utils/practicum-repository'
import { studentTaskScopeWhere } from '../../../../services/student-task-scope'

export default defineEventHandler(async event => {
  const user = requireStudent(event)
  const task = await prisma.studentTask.findFirst({
    where: await studentTaskScopeWhere(user, prisma, { id: getRouterParam(event, 'taskId') ?? '' }),
    include: { planAssignment: true },
  })
  if (!task) throw createError({ statusCode: 404, statusMessage: 'TASK_NOT_FOUND', data: { code: 'TASK_NOT_FOUND' } })

  const planDetail = getPlan(user, task.planAssignment.planId)
  if (!planDetail || 'forbidden' in planDetail) throw createError({ statusCode: 403, statusMessage: 'LEARNING_CONTENT_FORBIDDEN', data: { code: 'LEARNING_CONTENT_FORBIDDEN' } })
  const node = planDetail.nodes.find(item => item.id === task.activityId || item.activityId === task.activityId)
  const activity = node?.activityId ? planDetail.activities.find(item => item.id === node.activityId) : null
  if (!activity) throw createError({ statusCode: 404, statusMessage: 'ACTIVITY_NOT_FOUND', data: { code: 'ACTIVITY_NOT_FOUND' } })

  if (activity.config.type === 'SOFTWARE_ACTION') {
    const event = await prisma.taskEvent.findFirst({ where: { studentTaskId: task.id, eventType: 'SOFTWARE_STATE' }, orderBy: { createdAt: 'desc' } })
    const payload = event?.payload as { completedStepIds?: unknown; completedAt?: unknown } | undefined
    return {
      learningState: {
        type: 'SOFTWARE_ACTION',
        completedStepIds: Array.isArray(payload?.completedStepIds) ? payload.completedStepIds.filter((id): id is string => typeof id === 'string') : [],
        completedAt: typeof payload?.completedAt === 'string' ? payload.completedAt : null,
      },
    }
  }

  if (activity.config.type === 'TRAINING') {
    const events = await prisma.taskEvent.findMany({ where: { studentTaskId: task.id, eventType: 'TRAINING_ATTEMPT' }, orderBy: { createdAt: 'asc' } })
    return {
      learningState: {
        type: 'TRAINING',
        maxAttempts: activity.config.maxAttempts,
        attempts: events.flatMap(event => {
          const payload = event.payload as { answer?: unknown; feedback?: unknown; submittedAt?: unknown }
          return typeof payload.answer === 'string' && typeof payload.feedback === 'string' && typeof payload.submittedAt === 'string'
            ? [{ answer: payload.answer, feedback: payload.feedback, submittedAt: payload.submittedAt }]
            : []
        }),
      },
    }
  }

  throw createError({ statusCode: 422, statusMessage: 'LEARNING_STATE_UNSUPPORTED', data: { code: 'LEARNING_STATE_UNSUPPORTED' } })
})
