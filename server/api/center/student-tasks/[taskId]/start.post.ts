import { defineEventHandler, getRouterParam } from 'h3'
import { startStudentWorkOrder } from '../../../../services/student-work-orders'
import { requireStudent } from '../../../../utils/authorization'

export default defineEventHandler(event => startStudentWorkOrder(requireStudent(event), getRouterParam(event, 'taskId') ?? ''))
