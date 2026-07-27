import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { createResource } from '../../../utils/practicum-repository'

export default defineEventHandler(async (event) => {
  const user = requireAuthenticatedUser(event)
  const body = await readBody<{ planId?: string; name?: string; kind?: string; url?: string }>(event)
  if (!body?.planId || !body.name?.trim() || !['LINK', 'DOCUMENT', 'VIDEO'].includes(body.kind ?? '') || !/^https?:\/\//i.test(body.url ?? '')) {
    throw createError({ statusCode: 422, statusMessage: 'RESOURCE_VALIDATION', data: { code: 'RESOURCE_VALIDATION' } })
  }
  const rawKey = event.node.req.headers['idempotency-key']
  const result = createResource(user, { planId: body.planId, name: body.name, kind: body.kind as 'LINK' | 'DOCUMENT' | 'VIDEO', url: body.url! }, Array.isArray(rawKey) ? rawKey[0] : rawKey)
  if (result.kind === 'FORBIDDEN') throw createError({ statusCode: 403, statusMessage: 'RESOURCE_FORBIDDEN', data: { code: 'RESOURCE_FORBIDDEN' } })
  setResponseStatus(event, result.kind === 'REPLAY' ? 200 : 201)
  return { resource: result.resource }
})
