import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { prisma } from '../../../../../db/client'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { requireClassStaff } from '../../../../../services/class-scope'
import { unlockDependentTasks } from '../../../../../services/task-unlock'
export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const body = await readBody<{ score?: number; feedback?: string }>(event)
  const task = await prisma.studentTask.findUnique({ where: { id: getRouterParam(event, 'taskId') ?? '' }, include: { planAssignment: true, submissions: true } })
  if (!task || !task.submissions[0]) throw createError({ statusCode: 404, statusMessage: 'SUBMISSION_NOT_FOUND', data: { code: 'SUBMISSION_NOT_FOUND' } })
  await requireClassStaff(user, task.planAssignment.classId)
  const score = Number(body?.score)
  const feedback = body?.feedback?.trim() ?? ''
  if (!Number.isFinite(score) || score < 0 || score > 100 || !feedback) throw createError({ statusCode: 422, statusMessage: 'GRADE_INVALID', data: { code: 'GRADE_INVALID' } })
  const grade = await prisma.$transaction(async tx => {
    const currentGrade = await tx.grade.upsert({ where: { submissionId: task.submissions[0].id }, create: { submissionId: task.submissions[0].id, reviewerId: user.id, score, feedback }, update: { reviewerId: user.id, score, feedback, gradedAt: new Date() } })
    const latestRevision = await tx.gradeRevision.findFirst({ where: { gradeId: currentGrade.id }, orderBy: { revision: 'desc' }, select: { revision: true } })
    await tx.gradeRevision.create({ data: { gradeId: currentGrade.id, revision: (latestRevision?.revision ?? 0) + 1, reviewerId: user.id, score, feedback } })
    await tx.studentTask.update({ where: { id: task.id }, data: { status: 'GRADED' } })
    await unlockDependentTasks(tx, { planAssignmentId: task.planAssignmentId, studentId: task.studentId, now: new Date() })
    return currentGrade
  })
  return { grade }
})
