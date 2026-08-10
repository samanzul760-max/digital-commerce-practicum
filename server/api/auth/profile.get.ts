import { defineEventHandler } from 'h3'
import { requireAuthenticatedUser } from '../../utils/auth-session'

export default defineEventHandler((event) => ({ user: requireAuthenticatedUser(event) }))
