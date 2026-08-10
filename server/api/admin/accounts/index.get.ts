import { defineEventHandler } from 'h3'
import { listStudentAccounts } from '../../../services/admin-accounts'
import { requireAdmin } from '../../../utils/authorization'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return { items: await listStudentAccounts() }
})
