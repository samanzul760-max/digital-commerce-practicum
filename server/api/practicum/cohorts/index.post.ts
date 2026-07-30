import { createError, defineEventHandler, readBody } from 'h3'
import { prisma } from '../../../db/client'
import { requireAuthenticatedUser } from '../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  if (user.role !== 'OWNER') throw createError({ statusCode: 403, statusMessage: 'COHORT_FORBIDDEN', data: { code: 'COHORT_FORBIDDEN' } })
  const body = await readBody<{ organizationId?: string; name?: string; startsAt?: string; endsAt?: string }>(event)
  const organizationId = body?.organizationId?.trim() ?? ''
  const name = body?.name?.trim() ?? ''
  const startsAt = body?.startsAt ? new Date(body.startsAt) : null
  const endsAt = body?.endsAt ? new Date(body.endsAt) : null
  if (!organizationId || !name || !startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    throw createError({ statusCode: 422, statusMessage: 'COHORT_INVALID', data: { code: 'COHORT_INVALID' } })
  }
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } })
  if (!organization) throw createError({ statusCode: 404, statusMessage: 'ORGANIZATION_NOT_FOUND', data: { code: 'ORGANIZATION_NOT_FOUND' } })
  try {
    return { cohort: await prisma.cohort.create({ data: { organizationId, name, startsAt, endsAt } }) }
  } catch {
    throw createError({ statusCode: 409, statusMessage: 'COHORT_EXISTS', data: { code: 'COHORT_EXISTS' } })
  }
})
