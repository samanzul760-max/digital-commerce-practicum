import { defineEventHandler, getRouterParam } from 'h3'
import { resetStudentAccountPassword } from '../../../../services/admin-accounts'
import { requireAdmin } from '../../../../utils/authorization'

export default defineEventHandler(async event => await resetStudentAccountPassword(requireAdmin(event), getRouterParam(event, 'id') ?? ''))
