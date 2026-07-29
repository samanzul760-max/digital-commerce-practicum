import { defineEventHandler } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { listAssignments } from '../../../utils/practicum-repository'

export default defineEventHandler(event => listAssignments(requireAuthenticatedUser(event)))
