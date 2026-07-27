import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { seedActivities } from '../../data/practicum/activity-seed'
import { commerceCaseActivities } from '../../data/practicum/commerce-case-seed'
import { seedNodes, seedPlans, seedRoom } from '../../data/practicum/seed'
import type { Activity, CurriculumNode, Plan, PlanStatus, PrototypeMember, PracticumNotification, ResourceKind, SupportingResource } from '../../domain/practicum/types'
import type { AuthUser } from './auth-store'

export interface PersistedPlan extends Plan {
  version: number
}

interface RepositoryState {
  schemaVersion: 1
  rooms: typeof seedRoom[]
  plans: PersistedPlan[]
  nodes: CurriculumNode[]
  activities: Activity[]
  resources: SupportingResource[]
  members: PrototypeMember[]
  notifications: PracticumNotification[]
  assets: StoredAsset[]
  idempotency: Record<string, { userId: string; method: string; path: string; entityId: string }>
}

export interface StoredAsset {
  id: string
  name: string
  sizeBytes: number
  mimeType: string
  storageKey: string
  ownerId: string
  createdAt: string
}

const dataRoot = process.env.PRACTICUM_DATA_DIR || join(process.cwd(), '.data')
const repositoryPath = join(dataRoot, 'practicum-data.json')

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function initialState(): RepositoryState {
  const plans = clone(seedPlans).map(plan => ({ ...plan, version: 1 }))
  return {
    schemaVersion: 1,
    rooms: [clone(seedRoom)],
    plans,
    nodes: clone(seedNodes),
    activities: [...clone(seedActivities), ...clone(commerceCaseActivities)],
    resources: [],
    members: [{ id: 'member-001', label: '学生 001', role: 'STUDENT', group: '未分组' }],
    notifications: [],
    assets: [],
    idempotency: {},
  }
}

function readState(): RepositoryState {
  try {
    const parsed = JSON.parse(readFileSync(repositoryPath, 'utf8')) as RepositoryState
    if (parsed.schemaVersion === 1 && Array.isArray(parsed.plans)) {
      const defaults = initialState()
      return {
        ...defaults,
        ...parsed,
        members: parsed.members ?? defaults.members,
        notifications: parsed.notifications ?? defaults.notifications,
        assets: parsed.assets ?? defaults.assets,
        idempotency: parsed.idempotency ?? defaults.idempotency,
      }
    }
  } catch {
    // First request creates the local development store.
  }
  const state = initialState()
  writeState(state)
  return state
}

function writeState(state: RepositoryState) {
  mkdirSync(dirname(repositoryPath), { recursive: true })
  writeFileSync(repositoryPath, JSON.stringify(state, null, 2), 'utf8')
}

function canAccessRoom(user: AuthUser, roomId: string) {
  return user.roomIds.includes(roomId)
}

export function listPlans(user: AuthUser, input: {
  page: number
  pageSize: number
  keyword: string
  status?: PlanStatus
  sort: 'createdAt' | 'updatedAt' | 'title'
  direction: 'asc' | 'desc'
}) {
  const state = readState()
  const filtered = state.plans
    .filter(plan => canAccessRoom(user, plan.roomId))
    .filter(plan => user.role === 'OWNER' || plan.status === 'PUBLISHED')
    .filter(plan => !input.status || plan.status === input.status)
    .filter(plan => !input.keyword || `${plan.title} ${plan.description}`.toLowerCase().includes(input.keyword.toLowerCase()))
    .sort((a, b) => {
      const left = String(a[input.sort])
      const right = String(b[input.sort])
      const result = left.localeCompare(right, 'zh-CN')
      return input.direction === 'asc' ? result : -result
    })
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize))
  const page = Math.min(Math.max(1, input.page), totalPages)
  const start = (page - 1) * input.pageSize
  return { items: clone(filtered.slice(start, start + input.pageSize)), page, pageSize: input.pageSize, total, totalPages }
}

export function getPlan(user: AuthUser, planId: string) {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return null
  if (user.role !== 'OWNER' && plan.status !== 'PUBLISHED') return { forbidden: true as const }
  return {
    plan: clone(plan),
    nodes: clone(state.nodes.filter(node => node.planId === plan.id)),
    activities: clone(state.activities.filter(activity => state.nodes.some(node => node.planId === plan.id && node.activityId === activity.id))),
    resources: clone(state.resources.filter(resource => resource.planId === plan.id)),
  }
}

export function createPlan(user: AuthUser, input: { roomId: string; title: string; description: string }, idempotencyKey?: string) {
  const state = readState()
  if (idempotencyKey) {
    const existing = state.idempotency[`${user.id}:${idempotencyKey}`]
    if (existing) return { plan: clone(state.plans.find(item => item.id === existing.entityId)!), replayed: true }
  }
  const now = new Date().toISOString()
  const plan: PersistedPlan = {
    id: `plan-${randomUUID()}`,
    roomId: input.roomId,
    title: input.title.trim(),
    description: input.description.trim(),
    status: 'DRAFT',
    sort: state.plans.length + 1,
    moduleIds: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
  }
  state.plans.push(plan)
  if (idempotencyKey) state.idempotency[`${user.id}:${idempotencyKey}`] = { userId: user.id, method: 'POST', path: '/plans', entityId: plan.id }
  writeState(state)
  return { plan: clone(plan), replayed: false }
}

function ownerOnly(user: AuthUser) {
  return user.role === 'OWNER'
}

export function listResources(user: AuthUser, input: { page: number; pageSize: number; keyword: string; kind?: ResourceKind }) {
  const state = readState()
  if (!ownerOnly(user)) return { forbidden: true as const }
  const filtered = state.resources
    .filter(resource => !input.keyword || `${resource.name} ${resource.url}`.toLowerCase().includes(input.keyword.toLowerCase()))
    .filter(resource => !input.kind || resource.kind === input.kind)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize))
  const page = Math.min(Math.max(1, input.page), totalPages)
  return { items: clone(filtered.slice((page - 1) * input.pageSize, page * input.pageSize)), page, pageSize: input.pageSize, total, totalPages }
}

export function createResource(user: AuthUser, input: { planId: string; name: string; kind: ResourceKind; url: string }, idempotencyKey?: string) {
  const state = readState()
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (idempotencyKey) {
    const existing = state.idempotency[`${user.id}:${idempotencyKey}`]
    if (existing) return { kind: 'REPLAY' as const, resource: clone(state.resources.find(item => item.id === existing.entityId)!) }
  }
  const resource: SupportingResource = { id: `resource-${randomUUID()}`, ...input, name: input.name.trim(), url: input.url.trim() }
  state.resources.push(resource)
  if (idempotencyKey) state.idempotency[`${user.id}:${idempotencyKey}`] = { userId: user.id, method: 'POST', path: '/resources', entityId: resource.id }
  writeState(state)
  return { kind: 'CREATED' as const, resource: clone(resource) }
}

export function deleteResource(user: AuthUser, resourceId: string) {
  const state = readState()
  if (!ownerOnly(user)) return 'FORBIDDEN' as const
  const index = state.resources.findIndex(resource => resource.id === resourceId)
  if (index < 0) return 'NOT_FOUND' as const
  state.resources.splice(index, 1)
  writeState(state)
  return 'DELETED' as const
}

export function listMembers(user: AuthUser, input: { page: number; pageSize: number; keyword: string }) {
  const state = readState()
  if (!ownerOnly(user)) return { forbidden: true as const }
  const filtered = state.members.filter(member => !input.keyword || `${member.label} ${member.group}`.toLowerCase().includes(input.keyword.toLowerCase()))
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize))
  const page = Math.min(Math.max(1, input.page), totalPages)
  return { items: clone(filtered.slice((page - 1) * input.pageSize, page * input.pageSize)), page, pageSize: input.pageSize, total, totalPages }
}

export function updateMember(user: AuthUser, memberId: string, input: { group?: string; role?: 'OWNER' | 'STUDENT' }) {
  const state = readState()
  if (!ownerOnly(user)) return 'FORBIDDEN' as const
  const member = state.members.find(item => item.id === memberId)
  if (!member) return 'NOT_FOUND' as const
  if (input.group !== undefined) member.group = input.group.trim() || '未分组'
  if (input.role !== undefined) member.role = input.role
  writeState(state)
  return { member: clone(member) }
}

export function removeMember(user: AuthUser, memberId: string) {
  const state = readState()
  if (!ownerOnly(user)) return 'FORBIDDEN' as const
  const index = state.members.findIndex(item => item.id === memberId)
  if (index < 0) return 'NOT_FOUND' as const
  state.members.splice(index, 1)
  writeState(state)
  return 'DELETED' as const
}

export function listNotifications(user: AuthUser) {
  const state = readState()
  const items = state.notifications.filter(notification => notification.targetRole === user.role)
  return { items: clone(items), unread: items.filter(item => !item.read).length }
}

export function markNotificationRead(user: AuthUser, notificationId: string) {
  const state = readState()
  const notification = state.notifications.find(item => item.id === notificationId && item.targetRole === user.role)
  if (!notification) return false
  notification.read = true
  writeState(state)
  return true
}

export function getStats(user: AuthUser, roomId: string) {
  const state = readState()
  if (!canAccessRoom(user, roomId)) return null
  const plans = state.plans.filter(plan => plan.roomId === roomId && (user.role === 'OWNER' || plan.status === 'PUBLISHED'))
  return {
    planCount: plans.length,
    publishedPlanCount: plans.filter(plan => plan.status === 'PUBLISHED').length,
    draftPlanCount: user.role === 'OWNER' ? plans.filter(plan => plan.status === 'DRAFT').length : 0,
    memberCount: state.members.length,
    resourceCount: state.resources.length,
    activityCount: state.nodes.filter(node => plans.some(plan => plan.id === node.planId) && node.level === 3).length,
  }
}

export function saveAsset(user: AuthUser, asset: StoredAsset) {
  const state = readState()
  if (!ownerOnly(user)) return false
  state.assets.push(asset)
  writeState(state)
  return true
}

export function updatePlan(user: AuthUser, planId: string, input: { title?: string; description?: string; version: number }) {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (user.role !== 'OWNER') return { kind: 'FORBIDDEN' as const }
  if (plan.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (plan.version !== input.version) return { kind: 'CONFLICT' as const, currentVersion: plan.version }
  if (input.title !== undefined) plan.title = input.title.trim()
  if (input.description !== undefined) plan.description = input.description.trim()
  if (!plan.title || !plan.description) return { kind: 'VALIDATION' as const }
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  writeState(state)
  return { kind: 'OK' as const, plan: clone(plan) }
}

export function transitionPlan(user: AuthUser, planId: string, action: 'publish' | 'archive') {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (user.role !== 'OWNER') return { kind: 'FORBIDDEN' as const }
  if (action === 'publish' && plan.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (action === 'archive' && plan.status !== 'PUBLISHED') return { kind: 'STATE' as const }
  if (action === 'publish' && (!plan.title || !plan.description)) return { kind: 'VALIDATION' as const }
  plan.status = action === 'publish' ? 'PUBLISHED' : 'ARCHIVED'
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  writeState(state)
  return { kind: 'OK' as const, plan: clone(plan) }
}
