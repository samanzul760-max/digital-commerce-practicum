import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { setTemplateEnabled } from '../../../services/template-competition'
import { requireAuthenticatedUser } from '../../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ enabled?: boolean }>(event)
  if (typeof body?.enabled !== 'boolean') throw createError({ statusCode: 422, statusMessage: 'TEMPLATE_VALIDATION', data: { code: 'TEMPLATE_VALIDATION' } })
  const result = await setTemplateEnabled(requireAuthenticatedUser(event), getRouterParam(event, 'templateId') ?? '', body.enabled)
  if (result.kind === 'NOT_FOUND') throw createError({ statusCode: 404, statusMessage: 'TEMPLATE_NOT_FOUND', data: { code: 'TEMPLATE_NOT_FOUND' } })
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'TEMPLATE_FORBIDDEN', data: { code: 'TEMPLATE_FORBIDDEN' } })
  return { template: result.template }
})
