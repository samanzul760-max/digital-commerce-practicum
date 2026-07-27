import { defineEventHandler } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { listNotifications } from '../../../utils/practicum-repository'

export default defineEventHandler(event => listNotifications(requireAuthenticatedUser(event)))
