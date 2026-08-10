import { createError, defineEventHandler, readBody } from 'h3'
import { updateUserDisplayName } from '../../utils/auth-store'
import { requireAuthenticatedUser } from '../../utils/auth-session'

export default defineEventHandler(async (event) => {
  const currentUser = requireAuthenticatedUser(event)
  const body = await readBody<{ displayName?: string }>(event)
  const result = await updateUserDisplayName(currentUser.id, body?.displayName ?? '')
  if (result.kind === 'INVALID') {
    throw createError({ statusCode: 422, statusMessage: 'PROFILE_INVALID', data: { code: 'PROFILE_INVALID' } })
  }
  if (result.kind === 'NOT_FOUND') {
    throw createError({ statusCode: 404, statusMessage: 'PROFILE_NOT_FOUND', data: { code: 'PROFILE_NOT_FOUND' } })
  }

  return { user: result.user }
})
