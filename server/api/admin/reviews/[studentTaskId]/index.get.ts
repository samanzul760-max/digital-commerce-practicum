import { defineEventHandler, getRouterParam } from 'h3'
import { getReviewDetail } from '../../../../services/review-center'
import { requireAdmin } from '../../../../utils/authorization'

export default defineEventHandler(async event => getReviewDetail(requireAdmin(event), getRouterParam(event, 'studentTaskId') ?? ''))
