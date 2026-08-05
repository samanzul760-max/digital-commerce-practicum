import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthenticatedUser } from '../../../../utils/auth-session'
import { createFreightTemplate, type FreightTemplateInput } from '../../../../services/shop-sandbox'

export default defineEventHandler(async (event) => {
  const freightTemplate = await createFreightTemplate(requireAuthenticatedUser(event), await readBody<FreightTemplateInput>(event))
  setResponseStatus(event, 201)
  return { freightTemplate }
})
