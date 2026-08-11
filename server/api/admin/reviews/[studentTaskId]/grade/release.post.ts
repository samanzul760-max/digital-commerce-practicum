import { defineEventHandler, getRouterParam } from 'h3'
import { releaseGrade } from '../../../../../services/review-center'
import { requireAdmin } from '../../../../../utils/authorization'

export default defineEventHandler(event => releaseGrade(requireAdmin(event), getRouterParam(event, 'studentTaskId') ?? ''))
