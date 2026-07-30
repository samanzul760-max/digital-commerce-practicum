import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { prisma } from '../../../../../db/client'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { requireClassStaff } from '../../../../../services/class-scope'
export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const body = await readBody<{ score?: number; feedback?: string }>(event)
  const task = await prisma.studentTask.findUnique({ where: { id: getRouterParam(event, 'taskId') ?? '' }, include: { planAssignment: true, submissions: true } })
  if (!task || !task.submissions[0]) throw createError({ statusCode: 404, statusMessage: 'SUBMISSION_NOT_FOUND', data: { code: 'SUBMISSION_NOT_FOUND' } })
  await requireClassStaff(user, task.planAssignment.classId)
  const score = Number(body?.score)
  const feedback = body?.feedback?.trim() ?? ''
  if (!Number.isFinite(score) || score < 0 || score > 100 || !feedback) throw createError({ statusCode: 422, statusMessage: 'GRADE_INVALID', data: { code: 'GRADE_INVALID' } })
  const grade = await prisma.grade.upsert({ where: { submissionId: task.submissions[0].id }, create: { submissionId: task.submissions[0].id, reviewerId: user.id, score, feedback }, update: { reviewerId: user.id, score, feedback, gradedAt: new Date() } })
  await prisma.studentTask.update({ where: { id: task.id }, data: { status: 'GRADED' } })
  return { grade }
})
