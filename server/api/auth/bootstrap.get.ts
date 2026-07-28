import { defineEventHandler } from 'h3'
import { isBootstrapAvailable } from '../../utils/auth-store'

export default defineEventHandler(() => ({ available: isBootstrapAvailable() }))
