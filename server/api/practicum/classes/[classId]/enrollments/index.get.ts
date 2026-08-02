import { defineEventHandler, getRouterParam } from 'h3'
import { prisma } from '../../../../../db/client'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'
import { requireClassStaff } from '../../../../../services/class-scope'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const classId = getRouterParam(event, 'classId') ?? ''
  await requireClassStaff(user, classId)
  const items = await prisma.classEnrollment.findMany({ where: { classId }, orderBy: { role: 'asc' } })
  return { items }
})
