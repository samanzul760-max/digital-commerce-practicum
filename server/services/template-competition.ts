import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { commerceCases } from '../../data/practicum/commerce-case-seed'
import type { AuthUser } from '../utils/auth-store'

export type TemplateStatus = 'ENABLED' | 'DISABLED'
export type CompetitionStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type CompetitionEntryStatus = 'SUBMITTED'

export interface PracticumTemplate {
  id: string
  key: 'commerce-cases'
  roomId: string
  title: string
  description: string
  status: TemplateStatus
  enabled: boolean
  caseCount: number
  updatedAt: string
}

export interface Competition {
  id: string
  roomId: string
  title: string
  description: string
  status: CompetitionStatus
  createdBy: string
  createdAt: string
  publishedAt?: string
  closedAt?: string
}

export interface CompetitionEntry {
  id: string
  competitionId: string
  roomId: string
  studentId: string
  statement: string
  status: CompetitionEntryStatus
  submittedAt: string
}

interface StoredState {
  version: 1
  templates: PracticumTemplate[]
  competitions: Competition[]
  entries: CompetitionEntry[]
}

const dataRoot = process.env.PRACTICUM_DATA_DIR || join(process.cwd(), '.data')
const dataPath = join(dataRoot, 'template-competition-data.json')
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function emptyState(): StoredState {
  return { version: 1, templates: [], competitions: [], entries: [] }
}

function readState(): StoredState {
  try {
    const state = JSON.parse(readFileSync(dataPath, 'utf8')) as StoredState
    if (state.version === 1 && Array.isArray(state.templates) && Array.isArray(state.competitions) && Array.isArray(state.entries)) return state
  } catch {
    // The development data store is created on the first authorized request.
  }
  return emptyState()
}

function writeState(state: StoredState) {
  mkdirSync(dirname(dataPath), { recursive: true })
  writeFileSync(dataPath, JSON.stringify(state, null, 2), 'utf8')
}

function isOwner(user: AuthUser) {
  return user.role === 'OWNER'
}

function canAccessRoom(user: AuthUser, roomId: string) {
  return user.roomIds.includes(roomId)
}

function ensureRoomTemplates(state: StoredState, roomIds: string[]) {
  let changed = false
  for (const roomId of roomIds) {
    if (state.templates.some(template => template.roomId === roomId && template.key === 'commerce-cases')) continue
    state.templates.push({
      id: `template-commerce-cases-${roomId}`,
      key: 'commerce-cases',
      roomId,
      title: '电商教学案例',
      description: '引用当前案例库的匿名教学案例，不在浏览器复制案例数据。',
      status: 'ENABLED',
      enabled: true,
      caseCount: commerceCases.length,
      updatedAt: new Date().toISOString(),
    })
    changed = true
  }
  return changed
}

function templateForUser(state: StoredState, user: AuthUser, templateId: string) {
  const template = state.templates.find(item => item.id === templateId)
  return template && canAccessRoom(user, template.roomId) ? template : null
}

export function listTemplates(user: AuthUser) {
  const state = readState()
  if (ensureRoomTemplates(state, user.roomIds)) writeState(state)
  const items = state.templates
    .filter(template => canAccessRoom(user, template.roomId))
    .filter(template => isOwner(user) || template.enabled)
    .sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'))
  return { items: clone(items) }
}

export function getTemplate(user: AuthUser, templateId: string) {
  const state = readState()
  if (ensureRoomTemplates(state, user.roomIds)) writeState(state)
  const template = templateForUser(state, user, templateId)
  if (!template) return { kind: 'NOT_FOUND' as const }
  if (!template.enabled) return { kind: 'DISABLED' as const }
  return { kind: 'OK' as const, template: clone(template) }
}

export function setTemplateEnabled(user: AuthUser, templateId: string, enabled: boolean) {
  const state = readState()
  if (ensureRoomTemplates(state, user.roomIds)) writeState(state)
  const template = templateForUser(state, user, templateId)
  if (!template) return { kind: 'NOT_FOUND' as const }
  if (!isOwner(user)) return { kind: 'FORBIDDEN' as const }
  template.enabled = enabled
  template.status = enabled ? 'ENABLED' : 'DISABLED'
  template.updatedAt = new Date().toISOString()
  writeState(state)
  return { kind: 'OK' as const, template: clone(template) }
}

function competitionForUser(state: StoredState, user: AuthUser, competitionId: string) {
  const competition = state.competitions.find(item => item.id === competitionId)
  return competition && canAccessRoom(user, competition.roomId) ? competition : null
}

function serializeCompetition(competition: Competition, entry?: CompetitionEntry) {
  return { ...clone(competition), myEntry: entry ? clone(entry) : null }
}

export function listCompetitions(user: AuthUser) {
  const state = readState()
  const items = state.competitions
    .filter(competition => canAccessRoom(user, competition.roomId))
    .filter(competition => isOwner(user) || competition.status === 'PUBLISHED')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(competition => serializeCompetition(competition, state.entries.find(entry => entry.competitionId === competition.id && entry.studentId === user.id)))
  return { items }
}

export function getCompetition(user: AuthUser, competitionId: string) {
  const state = readState()
  const competition = competitionForUser(state, user, competitionId)
  if (!competition) return { kind: 'NOT_FOUND' as const }
  if (!isOwner(user) && competition.status !== 'PUBLISHED') return { kind: 'UNAVAILABLE' as const }
  return {
    kind: 'OK' as const,
    competition: serializeCompetition(competition, state.entries.find(entry => entry.competitionId === competition.id && entry.studentId === user.id)),
  }
}

export function createCompetition(user: AuthUser, input: { roomId: string; title: string; description: string }) {
  if (!isOwner(user)) return { kind: 'FORBIDDEN' as const }
  if (!canAccessRoom(user, input.roomId)) return { kind: 'NOT_FOUND' as const }
  const title = input.title.trim()
  const description = input.description.trim()
  if (!title || !description || title.length > 120 || description.length > 2000) return { kind: 'VALIDATION' as const }
  const state = readState()
  const competition: Competition = {
    id: `competition-${randomUUID()}`,
    roomId: input.roomId,
    title,
    description,
    status: 'DRAFT',
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  }
  state.competitions.push(competition)
  writeState(state)
  return { kind: 'OK' as const, competition: serializeCompetition(competition) }
}

export function transitionCompetition(user: AuthUser, competitionId: string, action: 'publish' | 'close') {
  const state = readState()
  const competition = competitionForUser(state, user, competitionId)
  if (!competition) return { kind: 'NOT_FOUND' as const }
  if (!isOwner(user)) return { kind: 'FORBIDDEN' as const }
  if (action === 'publish' && competition.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (action === 'close' && competition.status !== 'PUBLISHED') return { kind: 'STATE' as const }
  const now = new Date().toISOString()
  competition.status = action === 'publish' ? 'PUBLISHED' : 'CLOSED'
  if (action === 'publish') competition.publishedAt = now
  else competition.closedAt = now
  writeState(state)
  return { kind: 'OK' as const, competition: serializeCompetition(competition) }
}

export function enterCompetition(user: AuthUser, competitionId: string, statement: string) {
  const state = readState()
  const competition = competitionForUser(state, user, competitionId)
  if (!competition) return { kind: 'NOT_FOUND' as const }
  if (isOwner(user) || user.role !== 'STUDENT') return { kind: 'FORBIDDEN' as const }
  if (competition.status !== 'PUBLISHED') return { kind: 'STATE' as const }
  const normalizedStatement = statement.trim()
  if (!normalizedStatement || normalizedStatement.length > 4000) return { kind: 'VALIDATION' as const }
  if (state.entries.some(entry => entry.competitionId === competition.id && entry.studentId === user.id)) return { kind: 'EXISTS' as const }
  const entry: CompetitionEntry = {
    id: `competition-entry-${randomUUID()}`,
    competitionId: competition.id,
    roomId: competition.roomId,
    studentId: user.id,
    statement: normalizedStatement,
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
  }
  state.entries.push(entry)
  writeState(state)
  return { kind: 'OK' as const, entry: clone(entry) }
}
