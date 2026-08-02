import { defineEventHandler, getRouterParam } from 'h3'
import { listClassAssignments } from '../../../../../services/class-assignment'
import { requireAuthenticatedUser } from '../../../../../utils/auth-session'

export default defineEventHandler(async event => ({
  items: await listClassAssignments(requireAuthenticatedUser(event), getRouterParam(event, 'classId') ?? ''),
}))
