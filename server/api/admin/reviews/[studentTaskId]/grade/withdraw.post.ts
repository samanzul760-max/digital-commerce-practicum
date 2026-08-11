import { defineEventHandler, getRouterParam } from 'h3'
import { withdrawGrade } from '../../../../../services/review-center'
import { requireAdmin } from '../../../../../utils/authorization'

export default defineEventHandler(event => withdrawGrade(requireAdmin(event), getRouterParam(event, 'studentTaskId') ?? ''))
