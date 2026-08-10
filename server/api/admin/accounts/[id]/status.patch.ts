import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { setStudentAccountStatus } from '../../../../services/admin-accounts'
import { requireAdmin } from '../../../../utils/authorization'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ enabled?: boolean }>(event)
  if (typeof body?.enabled !== 'boolean') throw createError({ statusCode: 422, statusMessage: 'ACCOUNT_STATUS_INVALID', data: { code: 'ACCOUNT_STATUS_INVALID' } })
  return { account: await setStudentAccountStatus(requireAdmin(event), getRouterParam(event, 'id') ?? '', body.enabled) }
})
