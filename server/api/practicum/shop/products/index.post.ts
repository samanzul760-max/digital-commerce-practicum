import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { createProduct, type ProductInput } from '../../../../services/shop-sandbox'

export default defineEventHandler(async (event) => {
  const product = await createProduct(requireAuthenticatedUser(event), await readBody<ProductInput>(event))
  setResponseStatus(event, 201)
  return { product }
})
