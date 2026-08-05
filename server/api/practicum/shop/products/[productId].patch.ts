import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { updateProduct, type ProductInput } from '../../../../services/shop-sandbox'

export default defineEventHandler(async event => ({
  product: await updateProduct(requireAuthenticatedUser(event), getRouterParam(event, 'productId') ?? '', await readBody<ProductInput>(event)),
}))
