import { defineEventHandler, getQuery } from 'h3'
import { requireAuthenticatedUser } from '../../../utils/auth-session'
import { getTrainingRoomSetting } from '../../../services/member-lifecycle'

export default defineEventHandler(async (event) => {
  const setting = await getTrainingRoomSetting(requireAuthenticatedUser(event), { roomId: getQuery(event).roomId })
  return { setting }
})
