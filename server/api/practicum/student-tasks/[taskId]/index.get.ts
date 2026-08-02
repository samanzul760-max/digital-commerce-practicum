import { createError, defineEventHandler, getRouterParam } from 'h3'
import { prisma } from '../../../../db/client'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const task = await prisma.studentTask.findFirst({
    where: { id: getRouterParam(event, 'taskId') ?? '', studentId: user.id },
    include: { submissions: { include: { versions: { orderBy: { version: 'desc' } }, grade: true } } },
  })
  if (!task) throw createError({ statusCode: 404, statusMessage: 'TASK_NOT_FOUND', data: { code: 'TASK_NOT_FOUND' } })
  return { task: { id: task.id, status: task.status }, submission: task.submissions[0] ?? null }
})
