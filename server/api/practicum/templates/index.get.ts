import { defineEventHandler } from 'h3'
import { listTemplates } from '../../../services/template-competition'
import { requireAuthenticatedUser } from '../../../utils/auth-session'

export default defineEventHandler((event) => listTemplates(requireAuthenticatedUser(event)))
