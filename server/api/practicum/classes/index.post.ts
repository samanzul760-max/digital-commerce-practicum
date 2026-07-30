import { createError, defineEventHandler, readBody } from 'h3'
import { prisma } from '../../../db/client'
import { requireAuthenticatedUser } from '../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  if (user.role !== 'OWNER') throw createError({ statusCode: 403, statusMessage: 'CLASS_FORBIDDEN', data: { code: 'CLASS_FORBIDDEN' } })
  const body = await readBody<{ organizationId?: string; roomId?: string; cohortId?: string; name?: string }>(event)
  const organizationId = body?.organizationId?.trim() ?? ''
  const roomId = body?.roomId?.trim() ?? ''
  const cohortId = body?.cohortId?.trim() ?? ''
  const name = body?.name?.trim() ?? ''
  if (!organizationId || !roomId || !cohortId || !name) throw createError({ statusCode: 422, statusMessage: 'CLASS_INVALID', data: { code: 'CLASS_INVALID' } })
  const scope = await prisma.trainingRoom.findFirst({ where: { id: roomId, organizationId } })
  const cohort = await prisma.cohort.findFirst({ where: { id: cohortId, organizationId } })
  if (!scope || !cohort) throw createError({ statusCode: 404, statusMessage: 'CLASS_SCOPE_NOT_FOUND', data: { code: 'CLASS_SCOPE_NOT_FOUND' } })
  try {
    return { class: await prisma.class.create({ data: { organizationId, roomId, cohortId, name } }) }
  } catch {
    throw createError({ statusCode: 409, statusMessage: 'CLASS_EXISTS', data: { code: 'CLASS_EXISTS' } })
  }
})
