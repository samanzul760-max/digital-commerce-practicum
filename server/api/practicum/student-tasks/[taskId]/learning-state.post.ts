import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { prisma } from '../../../../db/client'
import { requireStudent } from '../../../../utils/authorization'
import { getPlan } from '../../../../utils/practicum-repository'
import { studentTaskScopeWhere } from '../../../../services/student-task-scope'

function feedbackFor(answer: string) {
  if (answer.length < 5) return '答案过于简短，请尝试更详细地回答。'
  if (answer.length > 20) return '回答较为完整，包含了必要信息。请继续巩固相关知识点。'
  return '回答已记录，部分要点可以进一步展开。'
}

export default defineEventHandler(async event => {
  const user = requireStudent(event)
  const task = await prisma.studentTask.findFirst({
    where: await studentTaskScopeWhere(user, prisma, { id: getRouterParam(event, 'taskId') ?? '' }),
    include: { planAssignment: true },
  })
  if (!task) throw createError({ statusCode: 404, statusMessage: 'TASK_NOT_FOUND', data: { code: 'TASK_NOT_FOUND' } })
  const now = new Date()
  const availability = task.availableAt > now ? 'NOT_YET_AVAILABLE' : task.dueAt && task.dueAt < now && !task.planAssignment.lateAllowed ? 'CLOSED' : 'AVAILABLE'
  if (task.status === 'LOCKED' || availability !== 'AVAILABLE') throw createError({ statusCode: 409, statusMessage: 'TASK_UNAVAILABLE', data: { code: 'TASK_UNAVAILABLE' } })

  const planDetail = getPlan(user, task.planAssignment.planId)
  if (!planDetail || 'forbidden' in planDetail) throw createError({ statusCode: 403, statusMessage: 'LEARNING_CONTENT_FORBIDDEN', data: { code: 'LEARNING_CONTENT_FORBIDDEN' } })
  const node = planDetail.nodes.find(item => item.id === task.activityId || item.activityId === task.activityId)
  const activity = node?.activityId ? planDetail.activities.find(item => item.id === node.activityId) : null
  if (!activity) throw createError({ statusCode: 404, statusMessage: 'ACTIVITY_NOT_FOUND', data: { code: 'ACTIVITY_NOT_FOUND' } })

  const body = await readBody<{ type?: string; completedStepIds?: unknown; complete?: unknown; answer?: unknown }>(event)
  if (body?.type === 'SOFTWARE_ACTION' && activity.config.type === 'SOFTWARE_ACTION') {
    if (!Array.isArray(body.completedStepIds) || body.completedStepIds.some(id => typeof id !== 'string')) throw createError({ statusCode: 422, statusMessage: 'LEARNING_STATE_INVALID', data: { code: 'LEARNING_STATE_INVALID' } })
    const allowedSteps = new Set(activity.config.steps.map(step => step.id))
    const completedStepIds = [...new Set(body.completedStepIds)].filter((id): id is string => typeof id === 'string')
    if (completedStepIds.some(id => !allowedSteps.has(id))) throw createError({ statusCode: 422, statusMessage: 'LEARNING_STATE_INVALID', data: { code: 'LEARNING_STATE_INVALID' } })
    const complete = body.complete === true
    const missing = activity.config.steps.filter(step => step.required && !completedStepIds.includes(step.id))
    if (complete && missing.length) throw createError({ statusCode: 422, statusMessage: 'SOFTWARE_REQUIRED_STEPS_INCOMPLETE', data: { code: 'SOFTWARE_REQUIRED_STEPS_INCOMPLETE' } })
    const completedAt = complete ? now.toISOString() : null
    await prisma.taskEvent.create({ data: { studentTaskId: task.id, eventType: 'SOFTWARE_STATE', payload: { completedStepIds, completedAt } } })
    return { learningState: { type: 'SOFTWARE_ACTION', completedStepIds, completedAt } }
  }

  if (body?.type === 'TRAINING' && activity.config.type === 'TRAINING') {
    const answer = typeof body.answer === 'string' ? body.answer.trim() : ''
    if (!answer) throw createError({ statusCode: 422, statusMessage: 'LEARNING_STATE_INVALID', data: { code: 'LEARNING_STATE_INVALID' } })
    const count = await prisma.taskEvent.count({ where: { studentTaskId: task.id, eventType: 'TRAINING_ATTEMPT' } })
    if (count >= activity.config.maxAttempts) throw createError({ statusCode: 409, statusMessage: 'TRAINING_ATTEMPTS_EXHAUSTED', data: { code: 'TRAINING_ATTEMPTS_EXHAUSTED' } })
    const attempt = { answer, feedback: feedbackFor(answer), submittedAt: now.toISOString() }
    await prisma.taskEvent.create({ data: { studentTaskId: task.id, eventType: 'TRAINING_ATTEMPT', payload: attempt } })
    const events = await prisma.taskEvent.findMany({ where: { studentTaskId: task.id, eventType: 'TRAINING_ATTEMPT' }, orderBy: { createdAt: 'asc' } })
    const attempts = events.flatMap(item => {
      const payload = item.payload as { answer?: unknown; feedback?: unknown; submittedAt?: unknown }
      return typeof payload.answer === 'string' && typeof payload.feedback === 'string' && typeof payload.submittedAt === 'string'
        ? [{ answer: payload.answer, feedback: payload.feedback, submittedAt: payload.submittedAt }]
        : []
    })
    return { learningState: { type: 'TRAINING', maxAttempts: activity.config.maxAttempts, attempts } }
  }

  throw createError({ statusCode: 422, statusMessage: 'LEARNING_STATE_INVALID', data: { code: 'LEARNING_STATE_INVALID' } })
})
