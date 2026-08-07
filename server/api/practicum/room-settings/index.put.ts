import { defineEventHandler, readBody } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { updateTrainingRoomSetting } from '../../../services/member-lifecycle'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ roomId?: string; description?: string; promotionalMediaUrl?: string; teachingMode?: string; visibility?: string }>(event)
  const setting = await updateTrainingRoomSetting(requireAuthenticatedUser(event), body)
  return { setting }
})
