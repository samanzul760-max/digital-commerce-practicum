import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3'
import { prisma } from '../../../db/client'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { requireClassRoomManager } from '../../../services/class-scope'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const body = await readBody<{ organizationId?: string; roomId?: string; cohortId?: string; name?: string }>(event)
  const organizationId = body?.organizationId?.trim() ?? ''
  const roomId = body?.roomId?.trim() ?? ''
  const cohortId = body?.cohortId?.trim() ?? ''
  const name = body?.name?.trim() ?? ''
  if (!organizationId || !roomId || !cohortId || !name) throw createError({ statusCode: 422, statusMessage: 'CLASS_INVALID', data: { code: 'CLASS_INVALID' } })
  await requireClassRoomManager(user, organizationId, roomId)
  const cohort = await prisma.cohort.findFirst({ where: { id: cohortId, organizationId } })
  if (!cohort) throw createError({ statusCode: 404, statusMessage: 'CLASS_SCOPE_NOT_FOUND', data: { code: 'CLASS_SCOPE_NOT_FOUND' } })
  try {
    const classroom = await prisma.$transaction(async (transaction) => {
      const created = await transaction.class.create({ data: { organizationId, roomId, cohortId, name } })
      if (user.role === 'TEACHER') {
        await transaction.classEnrollment.create({ data: { classId: created.id, userId: user.id, role: 'TEACHER' } })
      }
      return created
    })
    setResponseStatus(event, 201)
    return { class: classroom }
  } catch {
    throw createError({ statusCode: 409, statusMessage: 'CLASS_EXISTS', data: { code: 'CLASS_EXISTS' } })
  }
})
