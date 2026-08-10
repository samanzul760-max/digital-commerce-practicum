import { defineEventHandler } from 'h3'
import { listAdminClasses } from '../../../services/work-orders'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async event => ({ classes: await listAdminClasses(requireAdmin(event)) }))
