import { createError, defineEventHandler, getRouterParam } from 'h3'
import { prisma } from '../../../../../db/client'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { requireClassStaff } from '../../../../../services/class-scope'
export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const classId = getRouterParam(event, 'classId') ?? ''
  await requireClassStaff(user, classId)
  const students = await prisma.classEnrollment.findMany({ where: { classId, active: true, role: 'STUDENT' }, select: { userId: true } })
  const tasks = await prisma.studentTask.findMany({ where: { planAssignment: { classId } }, include: { submissions: { include: { grade: true } } } })
  const total = tasks.length
  const graded = tasks.filter(task => task.status === 'GRADED')
  const late = tasks.filter(task => task.dueAt && task.dueAt < new Date() && task.status !== 'GRADED').map(task => task.studentId)
  return { classId, learnerCount: students.length, taskCount: total, completionPercent: total ? Math.round(graded.length * 100 / total) : 0, averageScore: graded.length ? Math.round(graded.reduce((sum, task) => sum + Number(task.submissions[0]?.grade?.score ?? 0), 0) / graded.length) : 0, lateStudentIds: [...new Set(late)] }
})
