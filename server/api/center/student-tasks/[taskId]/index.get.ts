import { defineEventHandler, getRouterParam } from 'h3'
import { getStudentWorkOrder } from '../../../../services/student-work-orders'
import { requireStudent } from '../../../../utils/authorization'

export default defineEventHandler(event => getStudentWorkOrder(requireStudent(event), getRouterParam(event, 'taskId') ?? ''))
