import { createError } from 'h3'
import { Prisma } from '@prisma/client'
import { prisma } from '../db/client'
import type { AuthUser } from '../utils/auth-store'

type ScopeDb = Pick<Prisma.TransactionClient, 'class'>

function scopeError(): never {
  throw createError({ statusCode: 404, statusMessage: 'STUDENT_TASK_NOT_FOUND', data: { code: 'STUDENT_TASK_NOT_FOUND' } })
}

/**
 * Resolve class scope first so Prisma can enforce the enrollment and room
 * boundary in one StudentTask where clause. Organization/room consistency is
 * a relation-to-relation check, so it is explicitly filtered here.
 */
export async function studentTaskClassIds(user: AuthUser, db: ScopeDb = prisma) {
  if (!user.roomIds.length) return []
  const classes = await db.class.findMany({
    where: {
      roomId: { in: user.roomIds },
      enrollments: { some: { userId: user.id, active: true, role: 'STUDENT' } },
    },
    select: { id: true, organizationId: true, room: { select: { organizationId: true } } },
  })
  return classes.filter(item => item.organizationId === item.room.organizationId).map(item => item.id)
}

export async function studentTaskScopeWhere(user: AuthUser, db: ScopeDb = prisma, extra: Prisma.StudentTaskWhereInput = {}): Promise<Prisma.StudentTaskWhereInput> {
  const classIds = await studentTaskClassIds(user, db)
  return { AND: [{ studentId: user.id }, { planAssignment: { classId: { in: classIds } } }, extra] }
}

export async function requireStudentTaskScope(user: AuthUser, taskId: string) {
  const task = await prisma.studentTask.findFirst({ where: await studentTaskScopeWhere(user, prisma, { id: taskId }) })
  if (!task) scopeError()
  return task
}
