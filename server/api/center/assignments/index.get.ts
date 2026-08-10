import { defineEventHandler, getQuery } from 'h3'
import { listStudentAssignments } from '../../../services/student-work-orders'
import { requireStudent } from '../../../utils/authorization'

export default defineEventHandler(async event => {
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : undefined
  return { assignments: await listStudentAssignments(requireStudent(event), status) }
})
