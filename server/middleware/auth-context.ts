import { defineEventHandler, getCookie } from 'h3'
import { AUTH_COOKIE, getSessionContext } from '../utils/auth-store'

export default defineEventHandler(async (event) => {
  const context = await getSessionContext(getCookie(event, AUTH_COOKIE))
  if (context) event.context.learnecAuth = context
})
