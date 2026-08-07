import { createError } from 'h3'
import { prisma } from '../db/client'
import type { AuthUser } from '../utils/auth-store'
import { requireClassStaff } from './class-scope'

export interface AnnouncementInput {
  title?: string
  content?: string
  targetGroupId?: string
  announcementId?: string
  action?: 'PUBLISH' | 'CLOSE'
}

export interface SessionInput {
  action?: 'START' | 'END'
  activityId?: string
  sessionId?: string
}

function teachingError(statusCode: number, code: string) {
  return createError({ statusCode, statusMessage: code, data: { code } })
}

function requiredIdempotencyKey(value: string | undefined) {
  const key = value?.trim() ?? ''
  if (!key || key.length > 200) throw teachingError(422, 'TEACHING_INPUT_INVALID')
  return key
}

async function requireTargetGroup(classroom: { roomId: string }, targetGroupId: string | undefined) {
  if (!targetGroupId) return null
  const targetGroup = await prisma.virtualGroup.findFirst({ where: { id: targetGroupId, roomId: classroom.roomId } })
  if (!targetGroup) throw teachingError(422, 'TEACHING_INPUT_INVALID')
  return targetGroup.id
}

export async function listTeacherAnnouncements(user: AuthUser, classId: string) {
  await requireClassStaff(user, classId)
  const items = await prisma.classAnnouncement.findMany({
    where: { classId },
    orderBy: [{ createdAt: 'desc' }],
  })
  return { items }
}

export async function writeTeacherAnnouncement(user: AuthUser, classId: string, idempotencyKey: string | undefined, input: AnnouncementInput) {
  const classroom = await requireClassStaff(user, classId)
  const key = requiredIdempotencyKey(idempotencyKey)

  if (!input.action) {
    const title = input.title?.trim() ?? ''
    const body = input.content?.trim() ?? ''
    if (!title || !body || title.length > 120 || body.length > 4000) throw teachingError(422, 'TEACHING_INPUT_INVALID')
    const targetGroupId = await requireTargetGroup(classroom, input.targetGroupId?.trim())

    const existing = await prisma.classAnnouncement.findUnique({
      where: { classId_authorId_idempotencyKey: { classId, authorId: user.id, idempotencyKey: key } },
    })
    if (existing) return { announcement: existing, replayed: true }

    try {
      const announcement = await prisma.classAnnouncement.create({
        data: { classId, authorId: user.id, idempotencyKey: key, targetGroupId, title, body, status: 'DRAFT' },
      })
      return { announcement, replayed: false }
    } catch (error: unknown) {
      const replayed = await prisma.classAnnouncement.findUnique({
        where: { classId_authorId_idempotencyKey: { classId, authorId: user.id, idempotencyKey: key } },
      })
      if (replayed) return { announcement: replayed, replayed: true }
      throw error
    }
  }

  const announcementId = input.announcementId?.trim() ?? ''
  if (!announcementId || !['PUBLISH', 'CLOSE'].includes(input.action)) throw teachingError(422, 'TEACHING_INPUT_INVALID')
  const expectedStatus = input.action === 'PUBLISH' ? 'DRAFT' : 'PUBLISHED'
  const nextStatus = input.action === 'PUBLISH' ? 'PUBLISHED' : 'CLOSED'
  const now = new Date()
  const updated = await prisma.classAnnouncement.updateMany({
    where: { id: announcementId, classId, status: expectedStatus },
    data: input.action === 'PUBLISH' ? { status: nextStatus, publishedAt: now } : { status: nextStatus, closedAt: now },
  })
  const announcement = await prisma.classAnnouncement.findFirst({ where: { id: announcementId, classId } })
  if (!announcement) throw teachingError(404, 'ANNOUNCEMENT_NOT_FOUND')
  if (!updated.count && announcement.status !== nextStatus) throw teachingError(409, 'TEACHING_STATE_INVALID')
  return { announcement, replayed: !updated.count }
}

export async function listTeachingSessions(user: AuthUser, classId: string) {
  await requireClassStaff(user, classId)
  const items = await prisma.teachingSession.findMany({
    where: { classId },
    orderBy: [{ startedAt: 'desc' }],
  })
  return { items, currentSession: items.find(item => item.status === 'ACTIVE') ?? null }
}

export async function writeTeachingSession(user: AuthUser, classId: string, idempotencyKey: string | undefined, input: SessionInput) {
  await requireClassStaff(user, classId)
  const key = requiredIdempotencyKey(idempotencyKey)
  if (input.action === 'START') {
    const activityId = input.activityId?.trim() ?? ''
    if (!activityId) throw teachingError(422, 'TEACHING_INPUT_INVALID')
    const existing = await prisma.teachingSession.findUnique({ where: { classId_idempotencyKey: { classId, idempotencyKey: key } } })
    if (existing) return { session: existing, replayed: true }
    const active = await prisma.teachingSession.findFirst({ where: { classId, status: 'ACTIVE' } })
    if (active) throw teachingError(409, 'TEACHING_SESSION_ACTIVE')

    try {
      const session = await prisma.teachingSession.create({
        data: { classId, startedById: user.id, currentActivityId: activityId, idempotencyKey: key, status: 'ACTIVE' },
      })
      return { session, replayed: false }
    } catch (error: unknown) {
      const replayed = await prisma.teachingSession.findUnique({ where: { classId_idempotencyKey: { classId, idempotencyKey: key } } })
      if (replayed) return { session: replayed, replayed: true }
      throw error
    }
  }

  if (input.action !== 'END') throw teachingError(422, 'TEACHING_INPUT_INVALID')
  const sessionId = input.sessionId?.trim() ?? ''
  if (!sessionId) throw teachingError(422, 'TEACHING_INPUT_INVALID')
  const updated = await prisma.teachingSession.updateMany({
    where: { id: sessionId, classId, status: 'ACTIVE' },
    data: { status: 'ENDED', endedAt: new Date() },
  })
  const session = await prisma.teachingSession.findFirst({ where: { id: sessionId, classId } })
  if (!session) throw teachingError(404, 'TEACHING_SESSION_NOT_FOUND')
  if (!updated.count && session.status !== 'ENDED') throw teachingError(409, 'TEACHING_STATE_INVALID')
  return { session, replayed: !updated.count }
}

export async function getTeachingExecution(user: AuthUser, sessionId: string) {
  const session = await prisma.teachingSession.findUnique({ where: { id: sessionId } })
  if (!session) throw teachingError(404, 'TEACHING_SESSION_NOT_FOUND')
  await requireClassStaff(user, session.classId)
  const rows = await prisma.activityExecution.findMany({
    where: { teachingSessionId: session.id, activityId: session.currentActivityId ?? undefined },
    select: { status: true },
  })
  const execution = rows.reduce((summary, row) => {
    summary.total += 1
    if (row.status === 'NOT_STARTED') summary.notStarted += 1
    else if (row.status === 'IN_PROGRESS') summary.inProgress += 1
    else if (row.status === 'COMPLETED') summary.completed += 1
    return summary
  }, { total: 0, notStarted: 0, inProgress: 0, completed: 0 })
  return { session, execution, reviewHref: `/practicum/reviews?classId=${encodeURIComponent(session.classId)}` }
}
