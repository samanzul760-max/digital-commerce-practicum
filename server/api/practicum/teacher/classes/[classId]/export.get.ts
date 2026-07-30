import { defineEventHandler, getRouterParam, setHeader } from 'h3'
import { prisma } from '../../../../../db/client'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { requireClassStaff } from '../../../../../services/class-scope'
export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const classId = getRouterParam(event, 'classId') ?? ''
  await requireClassStaff(user, classId)
  const tasks = await prisma.studentTask.findMany({ where: { planAssignment: { classId } }, include: { planAssignment: true, submissions: { include: { grade: true } } }, orderBy: { studentId: 'asc' } })
  const quote = (value: string | number | null) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const rows = tasks.map(task => [task.studentId, task.planAssignment.title, task.activityId, task.status, task.dueAt?.toISOString() ?? '', task.submissions[0]?.grade?.score?.toString() ?? ''].map(quote).join(','))
  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="class-${classId}-learning.csv"`)
  return ['student_id,plan_title,activity_id,status,due_at,score', ...rows].join('\n')
})
