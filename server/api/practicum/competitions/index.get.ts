import { defineEventHandler } from 'h3'
import { listCompetitions } from '../../../services/template-competition'
import { requireAuthenticatedUser } from '../../../utils/auth-session'

export default defineEventHandler((event) => listCompetitions(requireAuthenticatedUser(event)))
