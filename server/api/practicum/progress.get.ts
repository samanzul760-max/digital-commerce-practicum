import { createError, defineEventHandler, getQuery } from 'h3'
import { prisma } from '../../db/client'
import { requireAuthenticatedUser } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const roomId = String(getQuery(event).roomId ?? '')
  const isTeacher = ['OWNER', 'TEACHER', 'MENTOR', 'ASSISTANT', 'HEAD_TEACHER'].includes(user.role)
  if (roomId && !user.roomIds.includes(roomId) && user.role !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'PROGRESS_FORBIDDEN', data: { code: 'PROGRESS_FORBIDDEN' } })
  }

  const assignments = await prisma.planAssignment.findMany({
    where: {
      status: { in: ['PUBLISHED', 'CLOSED'] },
      ...(roomId ? { class: { roomId } } : {}),
      ...(user.role === 'OWNER'
        ? {}
        : isTeacher
        ? { class: { ...(roomId ? { roomId } : {}), enrollments: { some: { userId: user.id, active: true, role: { in: ['TEACHER', 'MENTOR', 'ASSISTANT', 'HEAD_TEACHER'] } } } } }
        : { tasks: { some: { studentId: user.id } } }),
    },
    include: { tasks: isTeacher ? { include: { submissions: { include: { grade: true } } } } : { where: { studentId: user.id }, include: { submissions: { include: { grade: true } } } } },
    orderBy: { availableAt: 'asc' },
  })

  const plans = assignments.map((assignment) => {
    const tasks = assignment.tasks
    const completed = tasks.filter((task) => ['SUBMITTED', 'GRADED', 'CLOSED'].includes(task.status)).length
    const graded = tasks.filter((task) => task.status === 'GRADED' || task.status === 'CLOSED').length
    const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0
    const scores = tasks.flatMap((task) => task.submissions.map((submission) => submission.grade?.score ? Number(submission.grade.score) : null)).filter((score): score is number => score !== null)
    return { id: assignment.id, title: assignment.title, status: assignment.status, total: tasks.length, completed, graded, percent, nextTaskId: tasks.find((task) => !['SUBMITTED', 'GRADED', 'CLOSED'].includes(task.status))?.id ?? null, averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null }
  })

  return { plans, totals: { total: plans.reduce((sum, plan) => sum + plan.total, 0), completed: plans.reduce((sum, plan) => sum + plan.completed, 0), percent: plans.length ? Math.round(plans.reduce((sum, plan) => sum + plan.percent, 0) / plans.length) : 0 } }
})
