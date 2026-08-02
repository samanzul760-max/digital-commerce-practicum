import { createError } from 'h3'
import { prisma } from '../db/client'
import type { AuthUser } from '../utils/auth-store'
import { requireClassStaff } from './class-scope'

export interface PublishClassAssignmentInput {
  classId?: string
  planId?: string
  title?: string
  activityIds?: string[]
  availableAt?: string
  dueAt?: string
  lateAllowed?: boolean
}

export async function publishClassAssignment(user: AuthUser, path: string, idempotencyKey: string, input: PublishClassAssignmentInput) {
  const classId = input.classId?.trim() ?? ''
  const planId = input.planId?.trim() ?? ''
  const title = input.title?.trim() ?? ''
  const activityIds = [...new Set(input.activityIds?.filter(Boolean) ?? [])]
  const availableAt = input.availableAt ? new Date(input.availableAt) : null
  const dueAt = input.dueAt ? new Date(input.dueAt) : null
  if (!classId || !planId || !title || !activityIds.length || !availableAt || !idempotencyKey || Number.isNaN(availableAt.getTime()) || (dueAt && (Number.isNaN(dueAt.getTime()) || dueAt < availableAt))) {
    throw createError({ statusCode: 422, statusMessage: 'PLAN_ASSIGNMENT_INVALID', data: { code: 'PLAN_ASSIGNMENT_INVALID' } })
  }

  await requireClassStaff(user, classId)
  const students = await prisma.classEnrollment.findMany({ where: { classId, active: true, role: 'STUDENT' }, select: { userId: true } })
  return await prisma.$transaction(async transaction => {
    const existing = await transaction.planAssignmentIdempotencyKey.findUnique({
      where: { userId_method_path_key: { userId: user.id, method: 'POST', path, key: idempotencyKey } },
      include: { planAssignment: true },
    })
    if (existing) {
      const taskCount = await transaction.studentTask.count({ where: { planAssignmentId: existing.planAssignmentId } })
      return { assignment: existing.planAssignment, taskCount, replayed: true }
    }

    const assignment = await transaction.planAssignment.create({
      data: { classId, planId, title, status: 'PUBLISHED', availableAt, dueAt, lateAllowed: Boolean(input.lateAllowed) },
    })
    await transaction.studentTask.createMany({
      data: students.flatMap(student => activityIds.map(activityId => ({
        planAssignmentId: assignment.id,
        studentId: student.userId,
        activityId,
        status: 'AVAILABLE' as const,
        availableAt,
        dueAt,
      }))),
    })
    await transaction.planAssignmentIdempotencyKey.create({
      data: { userId: user.id, method: 'POST', path, key: idempotencyKey, planAssignmentId: assignment.id },
    })
    return { assignment, taskCount: students.length * activityIds.length, replayed: false }
  })
}

export async function listClassAssignments(user: AuthUser, classId: string) {
  await requireClassStaff(user, classId)
  const assignments = await prisma.planAssignment.findMany({
    where: { classId },
    include: { tasks: { select: { status: true } } },
    orderBy: { availableAt: 'desc' },
  })
  return assignments.map(({ tasks, ...assignment }) => ({
    ...assignment,
    taskCount: tasks.length,
    submittedCount: tasks.filter(task => task.status === 'SUBMITTED').length,
    gradedCount: tasks.filter(task => task.status === 'GRADED').length,
  }))
}
