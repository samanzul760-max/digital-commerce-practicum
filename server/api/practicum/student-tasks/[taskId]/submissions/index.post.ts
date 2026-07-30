import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { prisma } from '../../../../../db/client'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const taskId = getRouterParam(event, 'taskId') ?? ''
  const body = await readBody<{ text?: string; links?: string[] }>(event)
  const text = body?.text?.trim() ?? ''
  if (!text) throw createError({ statusCode: 422, statusMessage: 'SUBMISSION_INVALID', data: { code: 'SUBMISSION_INVALID' } })
  const task = await prisma.studentTask.findFirst({ where: { id: taskId, studentId: user.id }, include: { planAssignment: true } })
  if (!task) throw createError({ statusCode: 404, statusMessage: 'TASK_NOT_FOUND', data: { code: 'TASK_NOT_FOUND' } })
  if (task.availableAt > new Date() || (task.dueAt && task.dueAt < new Date() && !task.planAssignment.lateAllowed)) throw createError({ statusCode: 409, statusMessage: 'TASK_UNAVAILABLE', data: { code: 'TASK_UNAVAILABLE' } })
  const submission = await prisma.$transaction(async tx => {
    const current = await tx.submission.upsert({ where: { studentTaskId: task.id }, create: { studentTaskId: task.id, currentVersion: 0 }, update: {} })
    const version = current.currentVersion + 1
    await tx.submissionVersion.create({ data: { submissionId: current.id, version, text, links: body?.links ?? [] } })
    return tx.submission.update({ where: { id: current.id }, data: { currentVersion: version, submittedAt: new Date() } })
  })
  await prisma.studentTask.update({ where: { id: task.id }, data: { status: 'SUBMITTED' } })
  return { submission }
})
