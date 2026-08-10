import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { returnSubmission } from '../../../../services/review-center'
import { requireAdmin } from '../../../../utils/authorization'

export default defineEventHandler(async event => returnSubmission(requireAdmin(event), getRouterParam(event, 'studentTaskId') ?? '', await readBody(event)))
