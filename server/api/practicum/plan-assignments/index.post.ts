import { createError, defineEventHandler, readBody } from 'h3'
import { prisma } from '../../../db/client'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { requireClassStaff } from '../../../services/class-scope'

export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const body = await readBody<{ classId?: string; planId?: string; title?: string; activityIds?: string[]; availableAt?: string; dueAt?: string; lateAllowed?: boolean }>(event)
  const classId = body?.classId?.trim() ?? ''
  const planId = body?.planId?.trim() ?? ''
  const title = body?.title?.trim() ?? ''
  const activityIds = [...new Set(body?.activityIds?.filter(Boolean) ?? [])]
  const availableAt = body?.availableAt ? new Date(body.availableAt) : null
  const dueAt = body?.dueAt ? new Date(body.dueAt) : null
  if (!classId || !planId || !title || !activityIds.length || !availableAt || Number.isNaN(availableAt.getTime()) || (dueAt && (Number.isNaN(dueAt.getTime()) || dueAt < availableAt))) throw createError({ statusCode: 422, statusMessage: 'PLAN_ASSIGNMENT_INVALID', data: { code: 'PLAN_ASSIGNMENT_INVALID' } })
  await requireClassStaff(user, classId)
  const students = await prisma.classEnrollment.findMany({ where: { classId, active: true, role: 'STUDENT' }, select: { userId: true } })
  const assignment = await prisma.$transaction(async tx => {
    const created = await tx.planAssignment.create({ data: { classId, planId, title, status: 'PUBLISHED', availableAt, dueAt, lateAllowed: Boolean(body?.lateAllowed) } })
    await tx.studentTask.createMany({ data: students.flatMap(student => activityIds.map(activityId => ({ planAssignmentId: created.id, studentId: student.userId, activityId, status: 'AVAILABLE' as const, availableAt, dueAt }))) })
    return created
  })
  return { assignment, taskCount: students.length * activityIds.length }
})
