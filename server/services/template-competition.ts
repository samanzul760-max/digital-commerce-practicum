import { commerceCases } from '../../data/practicum/commerce-case-seed'
import { prisma } from '../db/client'
import type { AuthUser } from '../utils/auth-store'

export type TemplateStatus = 'ENABLED' | 'DISABLED'
export type CompetitionStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type CompetitionEntryStatus = 'SUBMITTED'

type TemplateCompetitionClient = {
  trainingRoom: any
  roomMember: any
  practicumTemplate: any
  competition: any
  competitionEntry: any
  $transaction: <T>(fn: (client: TemplateCompetitionClient) => Promise<T>) => Promise<T>
}

const db = prisma as unknown as TemplateCompetitionClient
const templateKey = 'commerce-cases'
const templateName = '电商教学案例'
const templateDescription = '引用当前案例库的匿名教学案例，不在浏览器复制案例数据。'

function isOwner(user: AuthUser) {
  return user.role === 'OWNER'
}

function iso(value: Date | null | undefined) {
  return value?.toISOString()
}

function templateDto(template: any) {
  return {
    id: template.id,
    key: template.templateKey,
    roomId: template.trainingRoomId,
    title: template.name,
    description: templateDescription,
    status: template.enabled ? 'ENABLED' as TemplateStatus : 'DISABLED' as TemplateStatus,
    enabled: template.enabled,
    caseCount: commerceCases.length,
    updatedAt: iso(template.updatedAt) ?? new Date().toISOString(),
  }
}

function entryDto(entry: any) {
  return {
    id: entry.id,
    competitionId: entry.competitionId,
    memberId: entry.memberId,
    status: entry.status as CompetitionEntryStatus,
    registeredAt: iso(entry.registeredAt) ?? new Date().toISOString(),
    submittedAt: iso(entry.submittedAt),
  }
}

function competitionDto(competition: any, entry?: any) {
  return {
    id: competition.id,
    roomId: competition.trainingRoomId,
    title: competition.name,
    description: competition.description,
    status: competition.status as CompetitionStatus,
    createdBy: competition.createdById,
    createdAt: iso(competition.createdAt) ?? new Date().toISOString(),
    publishedAt: iso(competition.publishedAt),
    myEntry: entry ? entryDto(entry) : null,
  }
}

async function authorizedRoomIds(user: AuthUser) {
  if (!user.roomIds.length) return []
  const rooms = await db.trainingRoom.findMany({ where: { id: { in: user.roomIds } }, select: { id: true } })
  return rooms.map((room: { id: string }) => room.id)
}

async function ensureRoomTemplates(roomIds: string[]) {
  await Promise.all(roomIds.map(trainingRoomId => db.practicumTemplate.upsert({
    where: { trainingRoomId_templateKey: { trainingRoomId, templateKey } },
    update: {},
    create: {
      trainingRoomId,
      templateKey,
      name: templateName,
      enabled: true,
      configuration: { source: 'commerce-case-seed', caseCount: commerceCases.length },
    },
  })))
}

async function roomIdsWithTemplates(user: AuthUser) {
  const roomIds = await authorizedRoomIds(user)
  if (isOwner(user)) await ensureRoomTemplates(roomIds)
  return roomIds
}

async function currentStudentMembers(user: AuthUser, roomIds: string[]) {
  if (!roomIds.length) return []
  return await db.roomMember.findMany({
    where: { roomId: { in: roomIds }, displayName: user.displayName, role: 'STUDENT' },
    select: { id: true, roomId: true },
  })
}

export async function listTemplates(user: AuthUser) {
  const roomIds = await roomIdsWithTemplates(user)
  const templates = await db.practicumTemplate.findMany({
    where: { trainingRoomId: { in: roomIds }, ...(isOwner(user) ? {} : { enabled: true }) },
    orderBy: { name: 'asc' },
  })
  return { items: templates.map(templateDto) }
}

export async function getTemplate(user: AuthUser, templateId: string) {
  const roomIds = await roomIdsWithTemplates(user)
  const template = await db.practicumTemplate.findFirst({ where: { id: templateId, trainingRoomId: { in: roomIds } } })
  if (!template) return { kind: 'NOT_FOUND' as const }
  if (!template.enabled) return { kind: 'DISABLED' as const }
  return { kind: 'OK' as const, template: templateDto(template) }
}

export async function setTemplateEnabled(user: AuthUser, templateId: string, enabled: boolean) {
  const roomIds = await roomIdsWithTemplates(user)
  const template = await db.practicumTemplate.findFirst({ where: { id: templateId, trainingRoomId: { in: roomIds } } })
  if (!template) return { kind: 'NOT_FOUND' as const }
  if (!isOwner(user)) return { kind: 'FORBIDDEN' as const }
  const updated = await db.practicumTemplate.update({ where: { id: template.id }, data: { enabled } })
  return { kind: 'OK' as const, template: templateDto(updated) }
}

export async function listCompetitions(user: AuthUser) {
  const roomIds = await authorizedRoomIds(user)
  const members = await currentStudentMembers(user, roomIds)
  const memberIds = members.map((member: { id: string }) => member.id)
  const competitions = await db.competition.findMany({
    where: { trainingRoomId: { in: roomIds }, ...(isOwner(user) ? {} : { status: 'PUBLISHED' }) },
    include: { entries: { where: { memberId: { in: memberIds } } } },
    orderBy: { createdAt: 'desc' },
  })
  return { items: competitions.map((competition: any) => competitionDto(competition, competition.entries[0])) }
}

export async function getCompetition(user: AuthUser, competitionId: string) {
  const roomIds = await authorizedRoomIds(user)
  const members = await currentStudentMembers(user, roomIds)
  const competition = await db.competition.findFirst({
    where: { id: competitionId, trainingRoomId: { in: roomIds } },
    include: { entries: { where: { memberId: { in: members.map((member: { id: string }) => member.id) } } } },
  })
  if (!competition) return { kind: 'NOT_FOUND' as const }
  if (!isOwner(user) && competition.status !== 'PUBLISHED') return { kind: 'UNAVAILABLE' as const }
  return { kind: 'OK' as const, competition: competitionDto(competition, competition.entries[0]) }
}

export async function createCompetition(user: AuthUser, input: { roomId: string; title: string; description: string }) {
  if (!isOwner(user)) return { kind: 'FORBIDDEN' as const }
  const roomIds = await authorizedRoomIds(user)
  if (!roomIds.includes(input.roomId)) return { kind: 'NOT_FOUND' as const }
  const title = input.title.trim()
  const description = input.description.trim()
  if (!title || !description || title.length > 120 || description.length > 2000) return { kind: 'VALIDATION' as const }
  const competition = await db.competition.create({
    data: { trainingRoomId: input.roomId, createdById: user.id, name: title, description, status: 'DRAFT' },
  })
  return { kind: 'OK' as const, competition: competitionDto(competition) }
}

export async function transitionCompetition(user: AuthUser, competitionId: string, action: 'publish' | 'close') {
  const roomIds = await authorizedRoomIds(user)
  const competition = await db.competition.findFirst({ where: { id: competitionId, trainingRoomId: { in: roomIds } } })
  if (!competition) return { kind: 'NOT_FOUND' as const }
  if (!isOwner(user)) return { kind: 'FORBIDDEN' as const }
  if (action === 'publish' && competition.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (action === 'close' && competition.status !== 'PUBLISHED') return { kind: 'STATE' as const }
  const updated = await db.competition.update({
    where: { id: competition.id },
    data: action === 'publish' ? { status: 'PUBLISHED', publishedAt: new Date() } : { status: 'CLOSED' },
  })
  return { kind: 'OK' as const, competition: competitionDto(updated) }
}

export async function enterCompetition(user: AuthUser, competitionId: string) {
  if (user.role !== 'STUDENT') return { kind: 'FORBIDDEN' as const }
  const roomIds = await authorizedRoomIds(user)
  const competition = await db.competition.findFirst({ where: { id: competitionId, trainingRoomId: { in: roomIds } } })
  if (!competition) return { kind: 'NOT_FOUND' as const }
  if (competition.status !== 'PUBLISHED') return { kind: 'STATE' as const }

  try {
    return await db.$transaction(async (client) => {
      const member = await client.roomMember.upsert({
        where: { roomId_displayName: { roomId: competition.trainingRoomId, displayName: user.displayName } },
        update: {},
        create: { roomId: competition.trainingRoomId, displayName: user.displayName, role: 'STUDENT' },
      })
      if (member.role !== 'STUDENT') return { kind: 'FORBIDDEN' as const }
      const existing = await client.competitionEntry.findUnique({ where: { competitionId_memberId: { competitionId: competition.id, memberId: member.id } } })
      if (existing) return { kind: 'EXISTS' as const }
      const entry = await client.competitionEntry.create({
        data: { competitionId: competition.id, memberId: member.id, status: 'SUBMITTED', submittedAt: new Date() },
      })
      return { kind: 'OK' as const, entry: entryDto(entry) }
    })
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') return { kind: 'EXISTS' as const }
    throw error
  }
}
