import { defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { listProducts } from '../../../../services/shop-sandbox'

export default defineEventHandler(async event => await listProducts(requireAuthenticatedUser(event), getQuery(event).roomId))
