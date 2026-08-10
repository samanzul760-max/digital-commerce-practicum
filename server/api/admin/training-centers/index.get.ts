import { defineEventHandler } from 'h3'
import { listTrainingCenters } from '../../../services/work-orders'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async event => ({ centers: await listTrainingCenters(requireAdmin(event)) }))
