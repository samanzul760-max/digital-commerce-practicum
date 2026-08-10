import { defineEventHandler, getQuery } from 'h3'
import { getClassLearningData } from '../../../services/review-center'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async event => {
  const classId = getQuery(event).classId
  return await getClassLearningData(requireAdmin(event), typeof classId === 'string' ? classId : '')
})
