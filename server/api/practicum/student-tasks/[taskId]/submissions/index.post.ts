import { createError, defineEventHandler, getHeader, getRouterParam, readBody } from 'h3'
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
  const key = getHeader(event, 'idempotency-key')?.trim()
  if (!key) throw createError({ statusCode: 422, statusMessage: 'IDEMPOTENCY_KEY_REQUIRED', data: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  const path = `/api/practicum/student-tasks/${task.id}/submissions`
  const replay = await prisma.submissionIdempotencyKey.findUnique({
    where: { userId_method_path_key: { userId: user.id, method: 'POST', path, key } },
    include: { submission: { include: { versions: { orderBy: { version: 'desc' } }, grade: true } } },
  })
  if (replay) return { task: { id: task.id, status: task.status }, submission: replay.submission }
  if (task.status === 'LOCKED') throw createError({ statusCode: 409, statusMessage: 'TASK_LOCKED', data: { code: 'TASK_LOCKED' } })
  if (!['AVAILABLE', 'RETURNED'].includes(task.status)) throw createError({ statusCode: 409, statusMessage: 'TASK_STATE_INVALID', data: { code: 'TASK_STATE_INVALID' } })
  if (task.availableAt > new Date() || (task.dueAt && task.dueAt < new Date() && !task.planAssignment.lateAllowed)) throw createError({ statusCode: 409, statusMessage: 'TASK_UNAVAILABLE', data: { code: 'TASK_UNAVAILABLE' } })
  const submission = await prisma.$transaction(async tx => {
    const existing = await tx.submissionIdempotencyKey.findUnique({
      where: { userId_method_path_key: { userId: user.id, method: 'POST', path, key } },
      include: { submission: true },
    })
    if (existing) return existing.submission
    const current = await tx.submission.upsert({ where: { studentTaskId: task.id }, create: { studentTaskId: task.id, currentVersion: 0 }, update: {} })
    const version = current.currentVersion + 1
    await tx.submissionVersion.create({ data: { submissionId: current.id, version, text, links: body?.links ?? [] } })
    const created = await tx.submission.update({ where: { id: current.id }, data: { currentVersion: version, submittedAt: new Date() } })
    await tx.submissionIdempotencyKey.create({ data: { userId: user.id, method: 'POST', path, key, submissionId: created.id } })
    await tx.studentTask.update({ where: { id: task.id }, data: { status: 'SUBMITTED' } })
    return created
  })
  const persistedTask = await prisma.studentTask.findUniqueOrThrow({
    where: { id: task.id },
    include: {
      submissions: {
        include: { versions: { orderBy: { version: 'desc' } } },
      },
    },
  })
  return { task: { id: persistedTask.id, status: persistedTask.status }, submission: persistedTask.submissions[0] }
})
