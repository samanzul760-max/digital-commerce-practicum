import { defineEventHandler, getQuery, setHeader } from 'h3'
import { exportClassGradebook } from '../../../services/review-center'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async event => {
  const classId = getQuery(event).classId
  const buffer = await exportClassGradebook(requireAdmin(event), typeof classId === 'string' ? classId : '')
  setHeader(event, 'content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'content-disposition', `attachment; filename="class-${classId}-grades.xlsx"`)
  return buffer
})
