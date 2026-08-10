import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { gradeSubmission } from '../../../../services/review-center'
import { requireAdmin } from '../../../../utils/authorization'

export default defineEventHandler(async event => gradeSubmission(requireAdmin(event), getRouterParam(event, 'studentTaskId') ?? '', await readBody(event)))
