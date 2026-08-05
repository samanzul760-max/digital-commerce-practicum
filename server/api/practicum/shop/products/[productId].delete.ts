import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { deleteProduct } from '../../../../services/shop-sandbox'

export default defineEventHandler(async (event) => {
  await deleteProduct(requireAuthenticatedUser(event), getQuery(event).roomId, getRouterParam(event, 'productId') ?? '')
  return { ok: true as const }
})
