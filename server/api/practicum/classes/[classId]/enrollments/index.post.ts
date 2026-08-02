import { createError, defineEventHandler, getRouterParam, readBody, setResponseStatus } from 'h3'
import { prisma } from '../../../../../db/client'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { findPublicUserById } from '../../../../../utils/auth-store'
import { requireClassStaff } from '../../../../../services/class-scope'

export default defineEventHandler(async event => {
  const user = requireAuthenticatedUser(event)
  const classId = getRouterParam(event, 'classId') ?? ''
  const body = await readBody<{ userId?: string; role?: 'STUDENT' }>(event)
  if (!body?.userId || body.role !== 'STUDENT') throw createError({ statusCode: 422, statusMessage: 'ENROLLMENT_INVALID', data: { code: 'ENROLLMENT_INVALID' } })
  await requireClassStaff(user, classId)
  const student = findPublicUserById(body.userId)
  if (!student || student.role !== 'STUDENT') throw createError({ statusCode: 422, statusMessage: 'ENROLLMENT_STUDENT_INVALID', data: { code: 'ENROLLMENT_STUDENT_INVALID' } })
  try {
    const enrollment = await prisma.classEnrollment.create({ data: { classId, userId: body.userId, role: 'STUDENT' } })
    setResponseStatus(event, 201)
    return { enrollment }
  }
  catch { throw createError({ statusCode: 409, statusMessage: 'ENROLLMENT_EXISTS', data: { code: 'ENROLLMENT_EXISTS' } }) }
})
