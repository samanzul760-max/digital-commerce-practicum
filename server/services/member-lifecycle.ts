import { createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import { findPublicUserById, type AuthUser } from '../utils/auth-store'

type LifecycleClient = {
  memberInvite: any
  joinApplication: any
  trainingRoomSetting: any
  trainingRoom: any
  virtualGroup: any
  roomMember: any
  $transaction: <T>(fn: (client: LifecycleClient) => Promise<T>) => Promise<T>
}

const lifecycleDb = prisma as unknown as LifecycleClient
const inviteStatuses = new Set(['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'])
const applicationStatuses = new Set(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])

export type InviteStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED'
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

function fail(statusCode: number, code: string) {
  throw createError({ statusCode, statusMessage: code, data: { code } })
}

function requiredText(value: unknown, code: string, maxLength = 240) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > maxLength) fail(400, code)
  return text
}

function optionalText(value: unknown, maxLength = 1000) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text.length > maxLength) fail(400, 'INVALID_TEXT')
  return text
}

function requiredRoomId(roomId: unknown) {
  return requiredText(roomId, 'ROOM_REQUIRED', 128)
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : null
}

function isExpired(invite: { expiresAt?: unknown }) {
  return invite.expiresAt instanceof Date && invite.expiresAt.getTime() <= Date.now()
}

function assertKnownInviteStatus(status: unknown): asserts status is InviteStatus {
  if (typeof status !== 'string' || !inviteStatuses.has(status)) fail(409, 'INVITE_STATE_INVALID')
}

function assertKnownApplicationStatus(status: unknown): asserts status is ApplicationStatus {
  if (typeof status !== 'string' || !applicationStatuses.has(status)) fail(409, 'APPLICATION_STATE_INVALID')
}

async function assertRoomExists(roomId: string) {
  if (!await lifecycleDb.trainingRoom.findUnique({ where: { id: roomId }, select: { id: true } })) fail(404, 'ROOM_NOT_FOUND')
}

export async function requireOwnerRoom(user: AuthUser, roomIdInput: unknown) {
  const roomId = requiredRoomId(roomIdInput)
  if (user.role !== 'OWNER' || !user.roomIds.includes(roomId)) fail(403, 'MEMBER_ROOM_FORBIDDEN')
  await assertRoomExists(roomId)
  return roomId
}

function inviteDto(invite: any) {
  return {
    id: invite.id,
    roomId: invite.trainingRoomId,
    code: invite.inviteCode,
    status: invite.status as InviteStatus,
    invitee: invite.invitee,
    groupName: invite.targetGroup?.name ?? '',
    expiresAt: toIso(invite.expiresAt),
    revokedAt: toIso(invite.revokedAt),
    usedAt: toIso(invite.usedAt),
    createdAt: toIso(invite.createdAt),
    updatedAt: toIso(invite.updatedAt),
  }
}

function applicationDto(application: any) {
  return {
    id: application.id,
    roomId: application.trainingRoomId,
    applicantId: application.applicantId,
    applicantLabel: findPublicUserById(application.applicantId)?.displayName ?? 'Hidden user',
    groupName: application.targetGroup?.name ?? '',
    status: application.status as ApplicationStatus,
    decidedAt: toIso(application.decidedAt),
    createdAt: toIso(application.createdAt),
    updatedAt: toIso(application.updatedAt),
  }
}

function settingDto(setting: any, roomId: string) {
  return {
    roomId,
    description: setting?.description ?? '',
    promotionalMediaUrl: setting?.coverUrl ?? '',
    teachingMode: setting?.teachingMode ?? 'STANDARD',
    visibility: setting?.visibility ?? 'PRIVATE',
    updatedAt: toIso(setting?.updatedAt),
  }
}

async function getOrCreateGroup(client: LifecycleClient, roomId: string, groupName: string) {
  const name = optionalText(groupName, 80)
  if (!name) return null
  return await client.virtualGroup.upsert({
    where: { roomId_name: { roomId, name } },
    update: {},
    create: { roomId, name },
  })
}

async function ensureRoomMember(client: LifecycleClient, roomId: string, applicantLabel: string, groupName: string) {
  const group = await getOrCreateGroup(client, roomId, groupName)
  const existing = await client.roomMember.findFirst({
    where: { roomId, displayName: applicantLabel },
    include: { group: true },
  })
  const member = existing
    ? await client.roomMember.update({ where: { id: existing.id }, data: { groupId: group?.id ?? null }, include: { group: true } })
    : await client.roomMember.create({ data: { roomId, displayName: applicantLabel, role: 'STUDENT', groupId: group?.id ?? null }, include: { group: true } })
  return { id: member.id, label: member.displayName, role: member.role, group: member.group?.name ?? 'Ungrouped' }
}

async function expireInviteIfNeeded(client: LifecycleClient, invite: any) {
  if (invite.status === 'ACTIVE' && isExpired(invite)) {
    return await client.memberInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } })
  }
  return invite
}

export async function createMemberInvite(user: AuthUser, input: { roomId?: unknown; invitee?: unknown; groupName?: unknown; expiresAt?: unknown; idempotencyKey?: unknown }) {
  const roomId = await requireOwnerRoom(user, input.roomId)
  const invitee = requiredText(input.invitee, 'INVITEE_REQUIRED', 128)
  if (!findPublicUserById(invitee)) fail(404, 'INVITEE_NOT_FOUND')
  const groupName = optionalText(input.groupName, 80)
  const expiresAt = input.expiresAt ? new Date(requiredText(input.expiresAt, 'INVALID_INVITE_EXPIRY')) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  if (expiresAt && Number.isNaN(expiresAt.getTime())) fail(400, 'INVALID_INVITE_EXPIRY')
  if (expiresAt && expiresAt.getTime() <= Date.now()) fail(400, 'INVITE_EXPIRY_IN_PAST')
  const idempotencyKey = optionalText(input.idempotencyKey, 128) || randomUUID()
  const targetGroup = await getOrCreateGroup(lifecycleDb, roomId, groupName)

  const invite = await lifecycleDb.memberInvite.upsert({
    where: { trainingRoomId_invitedById_idempotencyKey: { trainingRoomId: roomId, invitedById: user.id, idempotencyKey } },
    update: {},
    create: {
      trainingRoomId: roomId,
      invitedById: user.id,
      inviteCode: randomUUID(),
      status: 'ACTIVE',
      targetGroupId: targetGroup?.id ?? null,
      invitee,
      expiresAt,
      idempotencyKey,
    },
  })
  return inviteDto(await expireInviteIfNeeded(lifecycleDb, invite))
}

export async function listMemberInvites(user: AuthUser, input: { roomId?: unknown }) {
  const roomId = await requireOwnerRoom(user, input.roomId)
  const invites = await lifecycleDb.memberInvite.findMany({ where: { trainingRoomId: roomId }, include: { targetGroup: true }, orderBy: { createdAt: 'desc' }, take: 20 })
  return { items: await Promise.all(invites.map(async (invite: any) => inviteDto(await expireInviteIfNeeded(lifecycleDb, invite)))) }
}

export async function revokeMemberInvite(user: AuthUser, input: { roomId?: unknown; inviteId?: unknown }) {
  const roomId = await requireOwnerRoom(user, input.roomId)
  const inviteId = requiredText(input.inviteId, 'INVITE_REQUIRED', 128)
  const invite = await lifecycleDb.memberInvite.findFirst({ where: { id: inviteId, trainingRoomId: roomId } })
  if (!invite) fail(404, 'INVITE_NOT_FOUND')
  const current = await expireInviteIfNeeded(lifecycleDb, invite)
  assertKnownInviteStatus(current.status)
  if (current.status === 'REVOKED') return inviteDto(current)
  if (current.status !== 'ACTIVE') fail(409, 'INVITE_TRANSITION_FORBIDDEN')
  return inviteDto(await lifecycleDb.memberInvite.update({ where: { id: current.id }, data: { status: 'REVOKED', revokedAt: new Date() } }))
}

export async function redeemMemberInvite(user: AuthUser, input: { code?: unknown }) {
  const code = requiredText(input.code, 'INVITE_CODE_REQUIRED', 128)
  return await lifecycleDb.$transaction(async (client) => {
    const invite = await client.memberInvite.findUnique({ where: { inviteCode: code } })
    if (!invite) fail(404, 'INVITE_NOT_FOUND')
    const current = await expireInviteIfNeeded(client, invite)
    assertKnownInviteStatus(current.status)
    if (current.status !== 'ACTIVE') fail(409, 'INVITE_UNAVAILABLE')
    if (current.invitee !== user.id) fail(403, 'INVITE_RECIPIENT_FORBIDDEN')

    const targetGroup = current.targetGroupId
      ? await client.virtualGroup.findUnique({ where: { id: current.targetGroupId } })
      : null
    const usedAt = new Date()
    const transition = await client.memberInvite.updateMany({
      where: { id: current.id, status: 'ACTIVE' },
      data: { status: 'USED', usedAt },
    })
    if (transition.count !== 1) fail(409, 'INVITE_UNAVAILABLE')
    const member = await ensureRoomMember(client, current.trainingRoomId, user.displayName, targetGroup?.name ?? '')
    return { invite: inviteDto({ ...current, status: 'USED', usedAt, targetGroup }), member }
  })
}

export async function createJoinApplication(user: AuthUser, input: { roomId?: unknown; groupName?: unknown; idempotencyKey?: unknown }) {
  const roomId = requiredRoomId(input.roomId)
  await assertRoomExists(roomId)
  const groupName = optionalText(input.groupName, 80)
  const idempotencyKey = optionalText(input.idempotencyKey, 128) || randomUUID()
  const existing = await lifecycleDb.joinApplication.findFirst({ where: { trainingRoomId: roomId, applicantId: user.id, status: 'PENDING' }, include: { targetGroup: true } })
  if (existing) return applicationDto(existing)
  const targetGroup = await getOrCreateGroup(lifecycleDb, roomId, groupName)
  const application = await lifecycleDb.joinApplication.upsert({
    where: { trainingRoomId_applicantId_idempotencyKey: { trainingRoomId: roomId, applicantId: user.id, idempotencyKey } },
    update: {},
    create: {
      trainingRoomId: roomId,
      applicantId: user.id,
      targetGroupId: targetGroup?.id ?? null,
      status: 'PENDING',
      idempotencyKey,
    },
  })
  return applicationDto({ ...application, targetGroup })
}

export async function listJoinApplications(user: AuthUser, input: { roomId?: unknown }) {
  const roomId = await requireOwnerRoom(user, input.roomId)
  const applications = await lifecycleDb.joinApplication.findMany({ where: { trainingRoomId: roomId }, include: { targetGroup: true }, orderBy: { createdAt: 'desc' } })
  return { items: applications.map(applicationDto) }
}

export async function decideJoinApplication(user: AuthUser, input: { roomId?: unknown; applicationId?: unknown; decision?: unknown }) {
  const roomId = await requireOwnerRoom(user, input.roomId)
  const applicationId = requiredText(input.applicationId, 'APPLICATION_REQUIRED', 128)
  const decision = requiredText(input.decision, 'APPLICATION_DECISION_REQUIRED', 16)
  if (decision !== 'APPROVED' && decision !== 'REJECTED') fail(400, 'APPLICATION_DECISION_INVALID')

  return await lifecycleDb.$transaction(async (client) => {
    const application = await client.joinApplication.findFirst({ where: { id: applicationId, trainingRoomId: roomId }, include: { targetGroup: true } })
    if (!application) fail(404, 'APPLICATION_NOT_FOUND')
    assertKnownApplicationStatus(application.status)
    if (application.status === decision) {
      const member = decision === 'APPROVED'
        ? await ensureRoomMember(client, roomId, findPublicUserById(application.applicantId)?.displayName ?? 'Hidden user', application.targetGroup?.name ?? '')
        : null
      return { application: applicationDto(application), member }
    }
    if (application.status !== 'PENDING') fail(409, 'APPLICATION_TRANSITION_FORBIDDEN')
    const decidedAt = new Date()
    const transition = await client.joinApplication.updateMany({
      where: { id: application.id, status: 'PENDING' },
      data: { status: decision, decidedById: user.id, decidedAt },
    })
    if (transition.count !== 1) {
      const current = await client.joinApplication.findFirst({ where: { id: application.id, trainingRoomId: roomId }, include: { targetGroup: true } })
      if (!current || current.status !== decision) fail(409, 'APPLICATION_TRANSITION_FORBIDDEN')
      const member = decision === 'APPROVED'
        ? await ensureRoomMember(client, roomId, findPublicUserById(current.applicantId)?.displayName ?? 'Hidden user', current.targetGroup?.name ?? '')
        : null
      return { application: applicationDto(current), member }
    }
    const member = decision === 'APPROVED'
      ? await ensureRoomMember(client, roomId, findPublicUserById(application.applicantId)?.displayName ?? 'Hidden user', application.targetGroup?.name ?? '')
      : null
    return { application: applicationDto({ ...application, status: decision, decidedById: user.id, decidedAt }), member }
  })
}

export async function cancelJoinApplication(user: AuthUser, input: { applicationId?: unknown }) {
  const applicationId = requiredText(input.applicationId, 'APPLICATION_REQUIRED', 128)
  const application = await lifecycleDb.joinApplication.findFirst({ where: { id: applicationId, applicantId: user.id }, include: { targetGroup: true } })
  if (!application) fail(404, 'APPLICATION_NOT_FOUND')
  assertKnownApplicationStatus(application.status)
  if (application.status === 'CANCELLED') return applicationDto(application)
  if (application.status !== 'PENDING') fail(409, 'APPLICATION_TRANSITION_FORBIDDEN')
  const transition = await lifecycleDb.joinApplication.updateMany({ where: { id: application.id, status: 'PENDING' }, data: { status: 'CANCELLED' } })
  if (transition.count === 1) return applicationDto({ ...application, status: 'CANCELLED' })
  const current = await lifecycleDb.joinApplication.findFirst({ where: { id: application.id, applicantId: user.id }, include: { targetGroup: true } })
  if (current?.status === 'CANCELLED') return applicationDto(current)
  fail(409, 'APPLICATION_TRANSITION_FORBIDDEN')
}

export async function getTrainingRoomSetting(user: AuthUser, input: { roomId?: unknown }) {
  const roomId = await requireOwnerRoom(user, input.roomId)
  return settingDto(await lifecycleDb.trainingRoomSetting.findUnique({ where: { trainingRoomId: roomId } }), roomId)
}

export async function updateTrainingRoomSetting(user: AuthUser, input: { roomId?: unknown; description?: unknown; promotionalMediaUrl?: unknown; teachingMode?: unknown; visibility?: unknown }) {
  const roomId = await requireOwnerRoom(user, input.roomId)
  const description = optionalText(input.description, 4000)
  const promotionalMediaUrl = optionalText(input.promotionalMediaUrl, 2048)
  if (promotionalMediaUrl && !/^https:\/\//i.test(promotionalMediaUrl)) fail(400, 'INVALID_PROMOTIONAL_MEDIA_URL')
  const teachingMode = requiredText(input.teachingMode ?? 'STANDARD', 'INVALID_TEACHING_MODE', 32)
  const visibility = requiredText(input.visibility ?? 'PRIVATE', 'INVALID_VISIBILITY', 32)
  if (!['STANDARD', 'SELF_DIRECTED', 'BLENDED'].includes(teachingMode)) fail(400, 'INVALID_TEACHING_MODE')
  if (!['PRIVATE', 'ORGANIZATION'].includes(visibility)) fail(400, 'INVALID_VISIBILITY')
  const setting = await lifecycleDb.trainingRoomSetting.upsert({
    where: { trainingRoomId: roomId },
    update: { description, coverUrl: promotionalMediaUrl || null, teachingMode, visibility, version: { increment: 1 } },
    create: { trainingRoomId: roomId, description, coverUrl: promotionalMediaUrl || null, teachingMode, visibility },
  })
  return settingDto(setting, roomId)
}
