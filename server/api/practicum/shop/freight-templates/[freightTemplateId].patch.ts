import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { updateFreightTemplate, type FreightTemplateInput } from '../../../../services/shop-sandbox'

export default defineEventHandler(async event => ({
  freightTemplate: await updateFreightTemplate(requireAuthenticatedUser(event), getRouterParam(event, 'freightTemplateId') ?? '', await readBody<FreightTemplateInput>(event)),
}))
