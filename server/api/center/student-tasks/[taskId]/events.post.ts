import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { recordStudentTaskEvent } from '../../../../services/student-work-orders'
import { requireStudent } from '../../../../utils/authorization'

export default defineEventHandler(async event => recordStudentTaskEvent(requireStudent(event), getRouterParam(event, 'taskId') ?? '', await readBody(event)))
