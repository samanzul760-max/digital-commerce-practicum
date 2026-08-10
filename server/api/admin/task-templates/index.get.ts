import { defineEventHandler } from 'h3'
import { listWorkOrderTemplates } from '../../../services/work-orders'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async event => ({ templates: await listWorkOrderTemplates(requireAdmin(event)) }))
