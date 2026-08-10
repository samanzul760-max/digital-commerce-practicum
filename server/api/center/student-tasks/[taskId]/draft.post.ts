import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { saveStudentDraft } from '../../../../services/student-work-orders'
import { requireStudent } from '../../../../utils/authorization'

export default defineEventHandler(async event => saveStudentDraft(requireStudent(event), getRouterParam(event, 'taskId') ?? '', await readBody(event)))
