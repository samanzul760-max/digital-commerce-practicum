import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { createStudentAccount, type StudentAccountInput } from '../../../services/admin-accounts'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async (event) => {
  const created = await createStudentAccount(requireAdmin(event), await readBody<StudentAccountInput>(event))
  setResponseStatus(event, 201)
  return created
})
