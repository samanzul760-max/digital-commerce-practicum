import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getTemplate } from '../../../services/template-competition'
import { requireAuthenticatedUser } from '../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const result = await getTemplate(requireAuthenticatedUser(event), getRouterParam(event, 'templateId') ?? '')
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'TEMPLATE_NOT_FOUND', data: { code: 'TEMPLATE_NOT_FOUND' } })
  if (result.kind === 'DISABLED') throw createError({ statusCode: 403, statusMessage: 'TEMPLATE_DISABLED', data: { code: 'TEMPLATE_DISABLED' } })
  return result
})
