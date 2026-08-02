import { createError, defineEventHandler, getQuery } from 'h3'
import { prisma } from '../../../db/client'
import { requireClassRoomManager } from '../../../services/class-scope'
import { requireAuthenticatedUser } from '../../../utils/auth-session'

export default defineEventHandler(async event => {
  const query = getQuery(event)
  const organizationId = typeof query.organizationId === 'string' ? query.organizationId.trim() : ''
  const roomId = typeof query.roomId === 'string' ? query.roomId.trim() : ''
  if (!organizationId || !roomId) {
    throw createError({ statusCode: 422, statusMessage: 'COHORT_QUERY_INVALID', data: { code: 'COHORT_QUERY_INVALID' } })
  }
  await requireClassRoomManager(requireAuthenticatedUser(event), organizationId, roomId)
  return { items: await prisma.cohort.findMany({ where: { organizationId }, orderBy: { startsAt: 'desc' } }) }
})
