import { createError, defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  throw createError({ statusCode: 410, statusMessage: 'AUTH_BOOTSTRAP_DISABLED', data: { code: 'AUTH_BOOTSTRAP_DISABLED' } })
})
