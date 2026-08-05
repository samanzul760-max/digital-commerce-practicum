import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { deleteFreightTemplate } from '../../../../services/shop-sandbox'

export default defineEventHandler(async (event) => {
  await deleteFreightTemplate(requireAuthenticatedUser(event), getQuery(event).roomId, getRouterParam(event, 'freightTemplateId') ?? '')
  return { ok: true as const }
})
