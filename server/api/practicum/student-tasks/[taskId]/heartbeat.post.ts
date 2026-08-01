import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { prisma } from '../../../../db/client'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'

const allowedEvents = new Set(['HEARTBEAT', 'VISIBILITY_VISIBLE', 'VISIBILITY_HIDDEN'])

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const taskId = getRouterParam(event, 'taskId') ?? ''
  const body = await readBody<{ eventType?: string }>(event)
  const eventType = body?.eventType ?? 'HEARTBEAT'
  if (!allowedEvents.has(eventType)) throw createError({ statusCode: 422, statusMessage: 'HEARTBEAT_INVALID', data: { code: 'HEARTBEAT_INVALID' } })
  const task = await prisma.studentTask.findFirst({ where: { id: taskId, studentId: user.id }, select: { id: true } })
  if (!task) throw createError({ statusCode: 404, statusMessage: 'TASK_NOT_FOUND', data: { code: 'TASK_NOT_FOUND' } })
  await prisma.activityLog.create({ data: { userId: user.id, studentTaskId: task.id, eventType } })
  return { ok: true }
})
