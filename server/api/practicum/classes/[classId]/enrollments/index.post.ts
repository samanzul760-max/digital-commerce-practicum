import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { prisma } from '../../../../../db/client'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'

const roles = ['STUDENT', 'TEACHER', 'MENTOR', 'ASSISTANT', 'HEAD_TEACHER'] as const
export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  if (user.role !== 'OWNER') throw createError({ statusCode: 403, statusMessage: 'ENROLLMENT_FORBIDDEN', data: { code: 'ENROLLMENT_FORBIDDEN' } })
  const classId = getRouterParam(event, 'classId') ?? ''
  const body = await readBody<{ userId?: string; role?: typeof roles[number] }>(event)
  if (!body?.userId || !body.role || !roles.includes(body.role)) throw createError({ statusCode: 422, statusMessage: 'ENROLLMENT_INVALID', data: { code: 'ENROLLMENT_INVALID' } })
  if (!await prisma.class.findUnique({ where: { id: classId } })) throw createError({ statusCode: 404, statusMessage: 'CLASS_NOT_FOUND', data: { code: 'CLASS_NOT_FOUND' } })
  try { return { enrollment: await prisma.classEnrollment.create({ data: { classId, userId: body.userId, role: body.role } }) } }
  catch { throw createError({ statusCode: 409, statusMessage: 'ENROLLMENT_EXISTS', data: { code: 'ENROLLMENT_EXISTS' } }) }
})
