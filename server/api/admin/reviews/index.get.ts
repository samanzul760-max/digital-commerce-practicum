import { defineEventHandler, getQuery } from 'h3'
import { listReviewQueue } from '../../../services/review-center'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async event => {
  const query = getQuery(event)
  return { items: await listReviewQueue(requireAdmin(event), typeof query.status === 'string' ? query.status : undefined) }
})
