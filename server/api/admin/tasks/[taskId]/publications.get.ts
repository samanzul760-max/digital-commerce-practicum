import { defineEventHandler, getRouterParam } from 'h3'
import { getPublicationSummary } from '../../../../services/work-orders'
import { requireAdmin } from '../../../../utils/authorization'

export default defineEventHandler(async event => ({
  publication: await getPublicationSummary(requireAdmin(event), getRouterParam(event, 'taskId') ?? ''),
}))
