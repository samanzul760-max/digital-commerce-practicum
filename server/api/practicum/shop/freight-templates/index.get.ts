import { defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { listFreightTemplates } from '../../../../services/shop-sandbox'

export default defineEventHandler(async event => await listFreightTemplates(requireAuthenticatedUser(event), getQuery(event).roomId))
