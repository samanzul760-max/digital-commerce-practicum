import { defineEventHandler } from 'h3'
import { listTemplates } from '../../../services/template-competition'
import { requireAuthenticatedUser } from '../../../utils/auth-session'

export default defineEventHandler(async (event) => await listTemplates(requireAuthenticatedUser(event)))
