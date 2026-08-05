import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { seedActivities } from '../../data/practicum/activity-seed'
import { commerceCaseActivities, commerceCaseNodes } from '../../data/practicum/commerce-case-seed'
import { seedNodes, seedOrganizations, seedPlans, seedRooms } from '../../data/practicum/seed'
import type { Activity, ActivityType, AuditEvent, ClassroomAssignment, CurriculumNode, Organization, Plan, PlanStatus, PrototypeMember, PracticumNotification, ResourceKind, SupportingResource, PracticeSubmissionState, SubmissionVersion, ReviewQueueItem, FeedbackEntry } from '../../domain/practicum/types'
import type { AuthUser } from './auth-store'
import { defaultSkillLabels, getRoomMemberRow, getRoomMemberRows } from '../services/room-members'

export interface PersistedPlan extends Plan {
  version: number
}

interface RepositoryState {
  schemaVersion: 1
  organizations: Organization[]
  rooms: typeof seedRooms
  plans: PersistedPlan[]
  nodes: CurriculumNode[]
  activities: Activity[]
  resources: SupportingResource[]
  assignments: ClassroomAssignment[]
  members: PrototypeMember[]
  notifications: PracticumNotification[]
  assets: StoredAsset[]
  submissions: Record<string, PracticeSubmissionState>
  auditEvents: AuditEvent[]
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
  const plans = [...clone(seedPlans), { id: 'case-plan', roomId: 'room-001', title: '实践案例', description: '用于案例实践和审核的公开计划。', status: 'PUBLISHED' as const, sort: 99, moduleIds: [], createdAt: '2026-07-01T08:00:00Z', updatedAt: '2026-07-01T08:00:00Z' }].map(plan => ({ ...plan, version: 1 }))
  return {
    schemaVersion: 1,
    organizations: clone(seedOrganizations),
    rooms: clone(seedRooms),
    plans,
    nodes: [...clone(seedNodes), ...clone(commerceCaseNodes)],
    activities: [...clone(seedActivities), ...clone(commerceCaseActivities)],
    resources: [],
    assignments: [],
    members: [{ id: 'member-001', label: '学生 001', role: 'STUDENT', group: '未分组' }],
    notifications: [],
    assets: [],
    submissions: {},
    auditEvents: [],
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
        organizations: parsed.organizations ?? defaults.organizations,
        plans: [...defaults.plans.filter(plan => !parsed.plans.some(item => item.id === plan.id)), ...parsed.plans],
        nodes: [...defaults.nodes.filter(node => !parsed.nodes.some(item => item.id === node.id)), ...parsed.nodes],
        activities: [...defaults.activities.filter(activity => !parsed.activities.some(item => item.id === activity.id)), ...parsed.activities],
        members: parsed.members ?? defaults.members,
        notifications: parsed.notifications ?? defaults.notifications,
        assets: parsed.assets ?? defaults.assets,
        assignments: parsed.assignments ?? defaults.assignments,
        submissions: parsed.submissions ?? defaults.submissions,
        auditEvents: parsed.auditEvents ?? defaults.auditEvents,
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

function isSubmissionOwnedByMember(member: PrototypeMember, submission: PracticeSubmissionState) {
  const userId = member.userId ?? (member.id === 'member-001' ? 'user-student-001' : member.id)
  return submission.studentId === member.id || submission.studentId === userId
}

function canonicalSkillLabel(label: string) {
  if (/数据|分析/.test(label)) return '数据分析'
  if (/内容|文案|策划/.test(label)) return '内容策划'
  if (/视觉|设计|呈现/.test(label)) return '视觉呈现'
  if (/营销|投放|推广/.test(label)) return '营销投放'
  if (/客户|客服|服务/.test(label)) return '客户服务'
  return '商品运营'
}

export function getWorkspaceContext(user: AuthUser, selection?: { organizationId?: string; roomId?: string }) {
  const state = readState()
  const rooms = state.rooms.filter(room => canAccessRoom(user, room.id))
  const organizations = state.organizations
    .map(organization => ({ ...organization, roomIds: organization.roomIds.filter(roomId => rooms.some(room => room.id === roomId)) }))
    .filter(organization => organization.roomIds.length > 0)
  const organization = organizations.find(item => item.id === selection?.organizationId) ?? organizations[0]
  const room = rooms.find(item => item.id === selection?.roomId && organization?.roomIds.includes(item.id))
    ?? rooms.find(item => organization?.roomIds.includes(item.id))
  if (!organization || !room) return null
  return { organizations: clone(organizations), organization: clone(organization), room: clone(room) }
}

export function canSelectWorkspaceContext(user: AuthUser, input: { organizationId: string; roomId: string }) {
  const context = getWorkspaceContext(user, input)
  return Boolean(context && context.organization.id === input.organizationId && context.room.id === input.roomId)
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

export function createCurriculumNode(user: AuthUser, planId: string, input: {
  title?: string
  level?: number
  parentId?: string | null
  version?: number
}, idempotencyKey?: string) {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (plan.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (idempotencyKey && state.idempotency[`${user.id}:${idempotencyKey}`]) {
    return { kind: 'OK' as const, replayed: true, ...getPlan(user, planId)! }
  }
  if (!Number.isInteger(input.version)) return { kind: 'VALIDATION' as const }
  if (input.version !== plan.version) return { kind: 'CONFLICT' as const, currentVersion: plan.version }

  const title = input.title?.trim() ?? ''
  const level = input.level
  const parentId = input.parentId ?? null
  if (!title || level === undefined || ![1, 2, 3].includes(level)) return { kind: 'VALIDATION' as const }

  const parent = parentId ? state.nodes.find(node => node.id === parentId && node.planId === planId) : undefined
  if ((level === 1 && parentId !== null) || (level !== 1 && (!parent || parent.level !== level - 1))) {
    return { kind: 'VALIDATION' as const }
  }

  if (idempotencyKey) {
    const existing = state.idempotency[`${user.id}:${idempotencyKey}`]
    if (existing) return { kind: 'OK' as const, replayed: true, ...getPlan(user, planId)! }
  }

  const siblingSort = state.nodes.filter(node => node.planId === planId && node.parentId === parentId).length + 1
  const node: CurriculumNode = {
    id: `node-${randomUUID()}`,
    planId,
    parentId,
    level: level as CurriculumNode['level'],
    title,
    description: '',
    sort: siblingSort,
  }
  state.nodes.push(node)
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  if (idempotencyKey) state.idempotency[`${user.id}:${idempotencyKey}`] = { userId: user.id, method: 'POST', path: `/plans/${planId}/nodes`, entityId: node.id }
  writeState(state)
  return { kind: 'OK' as const, replayed: false, ...getPlan(user, planId)! }
}

export function createCustomActivity(user: AuthUser, planId: string, input: {
  parentId?: string
  title?: string
  type?: ActivityType
  version?: number
}, idempotencyKey?: string) {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (plan.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (idempotencyKey && state.idempotency[`${user.id}:${idempotencyKey}`]) {
    return { kind: 'OK' as const, replayed: true, ...getPlan(user, planId)! }
  }
  if (!Number.isInteger(input.version)) return { kind: 'VALIDATION' as const }
  if (input.version !== plan.version) return { kind: 'CONFLICT' as const, currentVersion: plan.version }

  const title = input.title?.trim() ?? ''
  const type = input.type
  const parent = state.nodes.find(node => node.id === input.parentId && node.planId === planId)
  if (!title || !parent || parent.level !== 2 || !type || !['SOFTWARE_ACTION', 'TRAINING', 'PRACTICE_ACTIVITY'].includes(type)) {
    return { kind: 'VALIDATION' as const }
  }

  const activityId = `activity-${randomUUID()}`
  const base = { id: activityId, type, title, objective: '', instructions: [], required: true, resourceIds: [] }
  const activity: Activity = type === 'SOFTWARE_ACTION'
    ? { ...base, config: { type: 'SOFTWARE_ACTION', steps: [] } }
    : type === 'TRAINING'
      ? { ...base, config: { type: 'TRAINING', maxAttempts: 3 } }
      : { ...base, config: { type: 'PRACTICE_ACTIVITY', deliverables: [], rubric: [] } }
  const node: CurriculumNode = {
    id: `node-${randomUUID()}`,
    planId,
    parentId: parent.id,
    level: 3,
    title,
    description: '',
    sort: state.nodes.filter(item => item.planId === planId && item.parentId === parent.id).length + 1,
    activityId,
    activityType: type,
  }
  state.activities.push(activity)
  state.nodes.push(node)
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  if (idempotencyKey) state.idempotency[`${user.id}:${idempotencyKey}`] = { userId: user.id, method: 'POST', path: `/plans/${planId}/activities`, entityId: node.id }
  writeState(state)
  return { kind: 'OK' as const, replayed: false, ...getPlan(user, planId)! }
}

export function updateCurriculumNode(user: AuthUser, planId: string, nodeId: string, input: { title?: string; version?: number }) {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (plan.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (!Number.isInteger(input.version)) return { kind: 'VALIDATION' as const }
  if (input.version !== plan.version) return { kind: 'CONFLICT' as const, currentVersion: plan.version }

  const node = state.nodes.find(item => item.id === nodeId && item.planId === planId)
  const title = input.title?.trim() ?? ''
  if (!node) return { kind: 'NOT_FOUND' as const }
  if (!title) return { kind: 'VALIDATION' as const }

  node.title = title
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  writeState(state)
  return { kind: 'OK' as const, ...getPlan(user, planId)! }
}

export function updateActivity(user: AuthUser, planId: string, activityId: string, input: { config?: Activity['config']; version?: number }) {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (plan.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (!Number.isInteger(input.version)) return { kind: 'VALIDATION' as const }
  if (input.version !== plan.version) return { kind: 'CONFLICT' as const, currentVersion: plan.version }
  const activity = state.activities.find(item => item.id === activityId && state.nodes.some(node => node.planId === planId && node.activityId === activityId))
  if (!activity || !input.config || input.config.type !== activity.config.type) return { kind: 'VALIDATION' as const }
  activity.config = clone(input.config)
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  writeState(state)
  return { kind: 'OK' as const, ...getPlan(user, planId)! }
}

export function reorderCurriculumNode(user: AuthUser, planId: string, nodeId: string, input: { targetNodeId?: string; version?: number }) {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (plan.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (!Number.isInteger(input.version)) return { kind: 'VALIDATION' as const }
  if (input.version !== plan.version) return { kind: 'CONFLICT' as const, currentVersion: plan.version }
  const node = state.nodes.find(item => item.id === nodeId && item.planId === planId)
  const target = state.nodes.find(item => item.id === input.targetNodeId && item.planId === planId)
  if (!node || !target || node.parentId !== target.parentId || node.level !== target.level) return { kind: 'VALIDATION' as const }
  const sort = node.sort
  node.sort = target.sort
  target.sort = sort
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  writeState(state)
  return { kind: 'OK' as const, ...getPlan(user, planId)! }
}

export function deleteCurriculumNode(user: AuthUser, planId: string, nodeId: string, input: { version?: number }) {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (plan.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (!Number.isInteger(input.version)) return { kind: 'VALIDATION' as const }
  if (input.version !== plan.version) return { kind: 'CONFLICT' as const, currentVersion: plan.version }
  const node = state.nodes.find(item => item.id === nodeId && item.planId === planId)
  if (!node) return { kind: 'NOT_FOUND' as const }

  const descendantIds = new Set([node.id])
  let changed = true
  while (changed) {
    changed = false
    for (const candidate of state.nodes) {
      if (candidate.parentId && descendantIds.has(candidate.parentId) && !descendantIds.has(candidate.id)) {
        descendantIds.add(candidate.id)
        changed = true
      }
    }
  }
  if ([...descendantIds].some(id => (state.submissions[id]?.versions.length ?? 0) > 0)) return { kind: 'STATE' as const }

  const activityIds = new Set(state.nodes
    .filter(item => descendantIds.has(item.id))
    .map(item => item.activityId)
    .filter((activityId): activityId is string => Boolean(activityId)))
  state.nodes = state.nodes.filter(item => !descendantIds.has(item.id))
  state.activities = state.activities.filter(item => !activityIds.has(item.id))
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  writeState(state)
  return { kind: 'OK' as const, ...getPlan(user, planId)! }
}

export function getCurriculumDeleteImpact(user: AuthUser, planId: string, nodeId: string) {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (!state.nodes.some(item => item.id === nodeId && item.planId === planId)) return { kind: 'NOT_FOUND' as const }

  const descendantIds = new Set([nodeId])
  let changed = true
  while (changed) {
    changed = false
    for (const node of state.nodes) {
      if (node.parentId && descendantIds.has(node.parentId) && !descendantIds.has(node.id)) {
        descendantIds.add(node.id)
        changed = true
      }
    }
  }
  const activityIds = [...descendantIds].filter(id => state.nodes.some(node => node.id === id && node.level === 3))
  return {
    kind: 'OK' as const,
    descendantCount: descendantIds.size - 1,
    activityCount: activityIds.length,
    evidenceCount: activityIds.filter(id => (state.submissions[id]?.versions.length ?? 0) > 0).length,
  }
}

function ownerOnly(user: AuthUser) {
  return user.role === 'OWNER'
}

function teachingStaffOnly(user: AuthUser) {
  return user.role === 'OWNER' || user.role === 'TEACHER' || user.role === 'MENTOR'
}

export function createAssignment(user: AuthUser, input: { planId: string; title: string; instructions: string; audience: 'ALL_STUDENTS' | 'GROUP'; groupId?: string }, idempotencyKey?: string) {
  const state = readState()
  const plan = state.plans.find(item => item.id === input.planId)
  if (!teachingStaffOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  const title = input.title.trim()
  const instructions = input.instructions.trim()
  if (!title || !instructions || (input.audience === 'GROUP' && !input.groupId?.trim())) return { kind: 'VALIDATION' as const }
  if (idempotencyKey) {
    const existing = state.idempotency[`${user.id}:${idempotencyKey}`]
    if (existing) return { kind: 'OK' as const, replayed: true, assignment: clone(state.assignments.find(item => item.id === existing.entityId)!) }
  }
  const assignment: ClassroomAssignment = { id: `assignment-${randomUUID()}`, roomId: plan.roomId, planId: plan.id, title, instructions, audience: input.audience, groupId: input.groupId?.trim(), status: 'DRAFT', authorId: user.id, createdAt: new Date().toISOString() }
  state.assignments.push(assignment)
  if (idempotencyKey) state.idempotency[`${user.id}:${idempotencyKey}`] = { userId: user.id, method: 'POST', path: '/assignments', entityId: assignment.id }
  writeState(state)
  return { kind: 'CREATED' as const, replayed: false, assignment: clone(assignment) }
}

export function publishAssignment(user: AuthUser, assignmentId: string) {
  const state = readState()
  const assignment = state.assignments.find(item => item.id === assignmentId)
  if (!teachingStaffOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (!assignment || !canAccessRoom(user, assignment.roomId)) return { kind: 'NOT_FOUND' as const }
  if (assignment.status !== 'DRAFT') return { kind: 'STATE' as const }
  assignment.status = 'PUBLISHED'
  assignment.publishedAt = new Date().toISOString()
  writeState(state)
  return { kind: 'OK' as const, assignment: clone(assignment) }
}

export function listAssignments(user: AuthUser) {
  const state = readState()
  const items = state.assignments
    .filter(assignment => canAccessRoom(user, assignment.roomId))
    .filter(assignment => user.role !== 'STUDENT' || assignment.status === 'PUBLISHED')
    .filter(assignment => user.role !== 'STUDENT' || assignment.audience === 'ALL_STUDENTS')
    .sort((left, right) => (right.publishedAt ?? right.createdAt).localeCompare(left.publishedAt ?? left.createdAt))
  return { items: clone(items) }
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
  const items = user.role === 'OWNER' ? state.notifications : state.notifications.filter(notification => notification.targetRole === user.role)
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
  const planIds = new Set(plans.map(plan => plan.id))
  const submissions = Object.values(state.submissions).filter(submission => {
    const activityId = submission.versions.at(-1)?.submissionId
    const context = activityId ? activityContext(state, activityId) : undefined
    return Boolean(context?.plan && planIds.has(context.plan.id))
  })
  return {
    planCount: plans.length,
    publishedPlanCount: plans.filter(plan => plan.status === 'PUBLISHED').length,
    draftPlanCount: user.role === 'OWNER' ? plans.filter(plan => plan.status === 'DRAFT').length : 0,
    memberCount: state.members.length,
    resourceCount: state.resources.length,
    activityCount: state.nodes.filter(node => plans.some(plan => plan.id === node.planId) && node.level === 3).length,
    submissionCount: submissions.length,
    gradedSubmissionCount: submissions.filter(submission => submission.status === 'GRADED').length,
    returnedSubmissionCount: submissions.filter(submission => submission.status === 'RETURNED').length,
  }
}

export function getAnalytics(user: AuthUser, roomId: string) {
  const state = readState()
  if (!ownerOnly(user) || !canAccessRoom(user, roomId)) return null

  const plans = state.plans.filter(plan => plan.roomId === roomId)
  const planIds = new Set(plans.map(plan => plan.id))
  const activityNodes = state.nodes.filter(node => node.level === 3 && planIds.has(node.planId))
  const activityNodeIds = new Set(activityNodes.map(node => node.id))
  const submissions = Object.entries(state.submissions)
    .filter(([activityId]) => activityNodeIds.has(activityId))
    .map(([activityId, submission]) => ({ activityId, submission, context: activityContext(state, activityId) }))
    .filter((item): item is typeof item & { context: { node: CurriculumNode; plan: PersistedPlan; activity: Activity | undefined } } => Boolean(item.context.node && item.context.plan))
  const totalLearners = state.members.filter(member => member.role === 'STUDENT').length
  const completedLearners = new Set(submissions
    .filter(item => item.submission.status === 'GRADED')
    .map(item => item.submission.studentId)
    .filter((studentId): studentId is string => Boolean(studentId))).size
  const gradedSubmissionCount = submissions.filter(item => item.submission.status === 'GRADED').length
  const totalPossible = activityNodes.length * totalLearners

  const planRows = plans.map(plan => {
    const planActivityIds = new Set(activityNodes.filter(node => node.planId === plan.id).map(node => node.id))
    const graded = submissions.filter(item => planActivityIds.has(item.activityId) && item.submission.status === 'GRADED').length
    const possible = planActivityIds.size * totalLearners
    return {
      planId: plan.id,
      title: plan.title,
      status: plan.status,
      learnerCount: totalLearners,
      percent: possible ? Math.round((graded / possible) * 100) : 0,
    }
  })

  const activityFeed = submissions.flatMap(({ activityId, submission, context }) => {
    const learnerLabel = submission.studentLabel ?? '匿名学员'
    const events = submission.versions.map(version => ({ learnerLabel, activityId, activityTitle: context.node.title, eventType: 'SUBMITTED', timestamp: version.submittedAt }))
    for (const event of state.auditEvents.filter(event => event.submissionId === activityId)) {
      events.push({ learnerLabel, activityId, activityTitle: context.node.title, eventType: event.action, timestamp: event.createdAt })
    }
    return events
  }).sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, 20)

  const scoreTotals = new Map<string, { learnerLabel: string; gradedCount: number; total: number }>()
  for (const { submission, context } of submissions) {
    if (submission.status !== 'GRADED' || !submission.grade || !submission.studentId || context.activity?.config.type !== 'PRACTICE_ACTIVITY') continue
    const maxScore = context.activity.config.rubric.reduce((total, item) => total + item.maxScore, 0)
    const score = Object.values(submission.grade.rubricScores).reduce((total, value) => total + value, 0)
    const current = scoreTotals.get(submission.studentId) ?? { learnerLabel: submission.studentLabel ?? '匿名学员', gradedCount: 0, total: 0 }
    current.gradedCount += 1
    current.total += maxScore ? Math.round((score / maxScore) * 100) : 0
    scoreTotals.set(submission.studentId, current)
  }
  const ranking = [...scoreTotals.entries()]
    .map(([studentId, item]) => ({ studentId, learnerLabel: item.learnerLabel, gradedCount: item.gradedCount, avgScore: Math.round(item.total / item.gradedCount) }))
    .sort((left, right) => right.avgScore - left.avgScore || left.learnerLabel.localeCompare(right.learnerLabel, 'zh-CN'))

  return clone({
    overview: {
      totalLearners,
      completedLearners,
      inactiveLearners: Math.max(0, totalLearners - new Set(submissions.map(item => item.submission.studentId).filter(Boolean)).size),
      overallCompletionPercent: totalPossible ? Math.round((gradedSubmissionCount / totalPossible) * 100) : 0,
    },
    plans: planRows,
    activityFeed,
    ranking,
  })
}

export async function getMemberAnalytics(user: AuthUser, roomId: string) {
  const state = readState()
  if (!ownerOnly(user) || !canAccessRoom(user, roomId)) return null

  const planIds = new Set(state.plans.filter(plan => plan.roomId === roomId).map(plan => plan.id))
  const activityIds = new Set(state.nodes.filter(node => node.level === 3 && planIds.has(node.planId)).map(node => node.id))
  const roomSubmissions = Object.entries(state.submissions)
    .filter(([activityId]) => activityIds.has(activityId))

  const databaseRows = await getRoomMemberRows(roomId)
  const rows = databaseRows
    .map(({ skillMetrics: _skillMetrics, planProgress: _planProgress, ...member }) => member)
    .sort((left, right) => right.completionPercent - left.completionPercent || left.learnerLabel.localeCompare(right.learnerLabel, 'zh-CN'))

  const skillTotals = new Map(defaultSkillLabels.map(skill => [skill, { score: 0, maxScore: 0 }]))
  for (const member of databaseRows) {
    for (const metric of member.skillMetrics) {
      const skill = canonicalSkillLabel(metric.skill)
      const current = skillTotals.get(skill)!
      current.score += metric.score
      current.maxScore += 100
    }
  }
  for (const [activityId, submission] of roomSubmissions) {
    if (submission.status !== 'GRADED' || !submission.grade) continue
    const activity = activityContext(state, activityId).activity
    if (activity?.config.type !== 'PRACTICE_ACTIVITY') continue
    for (const dimension of activity.config.rubric) {
      const skill = canonicalSkillLabel(dimension.label)
      const current = skillTotals.get(skill)!
      current.score += submission.grade.rubricScores[dimension.id] ?? 0
      current.maxScore += dimension.maxScore
    }
  }

  const skillDimensions = defaultSkillLabels.map(skill => {
    const totals = skillTotals.get(skill)!
    return { skill, score: totals.maxScore ? Math.round((totals.score / totals.maxScore) * 100) : 0 }
  })

  const groups = [...new Set(rows.map(member => member.groupLabel ?? '未分组'))].map(groupLabel => {
    const members = rows.filter(member => (member.groupLabel ?? '未分组') === groupLabel)
    return {
      groupLabel,
      learnerCount: members.length,
      averageCompletionPercent: members.length ? Math.round(members.reduce((sum, member) => sum + member.completionPercent, 0) / members.length) : 0,
      completedTaskCount: members.reduce((sum, member) => sum + member.gradedCount, 0),
    }
  }).filter(group => group.learnerCount)

  return clone({
    summary: {
      learnerCount: rows.length,
      averageCompletionPercent: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.completionPercent, 0) / rows.length) : 0,
      completedTaskCount: rows.reduce((sum, row) => sum + row.gradedCount, 0),
      pendingReviewCount: roomSubmissions.filter(([, submission]) => submission.status === 'SUBMITTED').length,
    },
    items: rows,
    groups,
    skillDimensions,
  })
}

export async function getMemberAnalyticsDetail(user: AuthUser, roomId: string, memberId: string) {
  const summary = await getMemberAnalytics(user, roomId)
  if (!summary) return null
  const member = summary.items.find(item => item.memberId === memberId)
  if (!member) return { kind: 'NOT_FOUND' as const }

  const databaseMember = await getRoomMemberRow(roomId, memberId)
  if (!databaseMember) return { kind: 'NOT_FOUND' as const }
  const skillMap = databaseMember.skillMetrics
    .map(item => {
      const score = item.score
      const mastery = score >= 80 ? 'MASTERED' : score >= 60 ? 'DEVELOPING' : 'NEEDS_SUPPORT'
      return {
        skill: item.skill,
        score,
        mastery,
        explanation: mastery === 'MASTERED' ? '评分表现稳定，可继续提升综合应用。' : mastery === 'DEVELOPING' ? '已具备基础能力，建议结合反馈继续练习。' : '建议根据评分反馈完成针对性练习。',
      }
    })
    .sort((left, right) => right.score - left.score || left.skill.localeCompare(right.skill, 'zh-CN'))

  return clone({
    kind: 'OK' as const,
    member,
    plans: databaseMember.planProgress,
    skillMap,
    strengths: skillMap.filter(item => item.mastery === 'MASTERED'),
    improvements: skillMap.filter(item => item.mastery !== 'MASTERED'),
  })
}

export function exportAnalyticsCsv(user: AuthUser, roomId: string) {
  const state = readState()
  if (!ownerOnly(user) || !canAccessRoom(user, roomId)) return null
  const planIds = new Set(state.plans.filter(plan => plan.roomId === roomId).map(plan => plan.id))
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const rows = Object.entries(state.submissions).flatMap(([activityId, submission]) => {
    const context = activityContext(state, activityId)
    const version = submission.versions.at(-1)
    if (!context.plan || !context.node || !planIds.has(context.plan.id) || !version) return []
    const score = submission.grade ? Object.values(submission.grade.rubricScores).reduce((total, value) => total + value, 0) : ''
    return [[
      escape(submission.studentId ?? 'anonymous'),
      escape(context.plan.title),
      escape(context.node.title),
      escape(submission.status),
      escape(version.version),
      escape(score),
    ].join(',')]
  })
  return ['member_id,plan_title,activity_title,status,version,score', ...rows].join('\n')
}

export function getPlanAnalytics(user: AuthUser, roomId: string, planId: string) {
  const state = readState()
  if (!ownerOnly(user) || !canAccessRoom(user, roomId)) return null
  const plan = state.plans.find(item => item.id === planId && item.roomId === roomId)
  if (!plan) return { kind: 'NOT_FOUND' as const }
  const activityNodes = state.nodes.filter(node => node.planId === plan.id && node.level === 3)
  const activities = activityNodes.map(node => ({
    activityId: node.id,
    title: node.title,
    status: state.submissions[node.id]?.status ?? 'NOT_STARTED',
  }))
  const gradedCount = activities.filter(activity => activity.status === 'GRADED').length
  return clone({
    kind: 'OK' as const,
    plan: { id: plan.id, title: plan.title, activityCount: activities.length, gradedCount, completionPercent: activities.length ? Math.round((gradedCount / activities.length) * 100) : 0 },
    activities,
  })
}

export function saveAsset(user: AuthUser, asset: StoredAsset) {
  const state = readState()
  if (!ownerOnly(user)) return false
  state.assets.push(asset)
  writeState(state)
  return true
}

function activityContext(state: RepositoryState, activityId: string) {
  const node = state.nodes.find(item => item.id === activityId)
  const plan = node ? state.plans.find(item => item.id === node.planId) : undefined
  const activity = state.activities.find(item => item.id === node?.activityId || item.id === activityId || item.id === `activity-${activityId}`)
  return { node, plan, activity }
}

function appendNotification(state: RepositoryState, notification: PracticumNotification) {
  state.notifications.unshift(notification)
}

export function listSubmissions(user: AuthUser, input: { status?: string; planId?: string; unitId?: string; student?: string; sort?: 'oldest' | 'newest'; page: number; pageSize: number }) {
  const state = readState()
  if (user.role !== 'OWNER') return { forbidden: true as const }
  const items: ReviewQueueItem[] = Object.entries(state.submissions).flatMap(([activityId, submission]) => {
    const context = activityContext(state, activityId)
    const version = submission.versions.at(-1)
    const unit = context.node?.parentId ? state.nodes.find(item => item.id === context.node!.parentId) : undefined
    if (!context.node || !context.plan || !version || !unit || !canAccessRoom(user, context.plan.roomId)) return []
    if (input.status && submission.status !== input.status) return []
    if (input.planId && context.plan.id !== input.planId) return []
    if (input.unitId && unit.id !== input.unitId) return []
    if (input.student && !(submission.studentLabel ?? '').toLowerCase().includes(input.student.toLowerCase())) return []
    return [{
      submissionId: activityId,
      studentId: submission.studentId ?? 'student-001',
      studentLabel: submission.studentLabel ?? '瀛︾敓 001',
      planId: context.plan.id,
      planTitle: context.plan.title,
      unitId: unit.id,
      unitTitle: unit.title,
      activityId,
      activityTitle: context.node.title,
      version: version.version,
      submittedAt: version.submittedAt,
      status: submission.status,
      reviewScope: submission.reviewScope ?? 'PLAN',
    }]
  })
  items.sort((left, right) => {
    const difference = new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime()
    return input.sort === 'newest' ? -difference : difference
  })
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize))
  const page = Math.min(Math.max(1, input.page), totalPages)
  return { items: clone(items.slice((page - 1) * input.pageSize, page * input.pageSize)), page, pageSize: input.pageSize, total, totalPages }
}

export function getSubmission(user: AuthUser, activityId: string) {
  const state = readState()
  const submission = state.submissions[activityId]
  const context = activityContext(state, activityId)
  if (!submission || !context.node || !context.plan || !canAccessRoom(user, context.plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (user.role !== 'OWNER' && submission.studentId !== user.id) return { kind: 'FORBIDDEN' as const }
  return { kind: 'OK' as const, submission: clone(submission), node: clone(context.node), activity: clone(context.activity), auditEvents: clone(state.auditEvents.filter(event => event.submissionId === activityId)) }
}

export function submitPractice(user: AuthUser, input: { activityId: string; text: string }, idempotencyKey?: string) {
  const state = readState()
  if (user.role !== 'STUDENT') return { kind: 'FORBIDDEN' as const }
  const context = activityContext(state, input.activityId)
  if (!context.node || !context.plan || !context.activity || !canAccessRoom(user, context.plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (context.plan.status !== 'PUBLISHED' || context.activity.type !== 'PRACTICE_ACTIVITY') return { kind: 'STATE' as const }
  const text = input.text.trim()
  if (!text) return { kind: 'VALIDATION' as const }
  if (idempotencyKey) {
    const existing = state.idempotency[`${user.id}:${idempotencyKey}`]
    if (existing) return { kind: 'OK' as const, replayed: true, submission: clone(state.submissions[existing.entityId]) }
  }
  const current = state.submissions[input.activityId]
  if (current && !['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'].includes(current.status)) return { kind: 'STATE' as const }
  const now = new Date().toISOString()
  const version: SubmissionVersion = {
    id: `submission-${input.activityId}-${(current?.versions.length ?? 0) + 1}`,
    submissionId: input.activityId,
    version: (current?.versions.length ?? 0) + 1,
    text,
    links: [],
    attachments: [],
    submittedAt: now,
  }
  const submission: PracticeSubmissionState = {
    ...(current ?? { versions: [] }),
    studentId: user.id,
    studentLabel: user.displayName,
    status: 'SUBMITTED',
    versions: [...(current?.versions ?? []), version],
    reviewScope: current?.reviewScope ?? 'PLAN',
  }
  state.submissions[input.activityId] = submission
  if (idempotencyKey) state.idempotency[`${user.id}:${idempotencyKey}`] = { userId: user.id, method: 'POST', path: '/submissions', entityId: input.activityId }
  appendNotification(state, { id: `notification-${randomUUID()}`, type: 'NEW_SUBMISSION', title: '收到新的实践提交', message: `${user.displayName} 提交了“${context.node.title}”。`, targetRole: 'OWNER', targetRoute: `/practicum/submissions/${input.activityId}`, read: false, createdAt: now })
  writeState(state)
  return { kind: 'OK' as const, replayed: false, submission: clone(submission) }
}

export function returnSubmission(user: AuthUser, activityId: string, feedback: string) {
  const state = readState()
  if (user.role !== 'OWNER') return { kind: 'FORBIDDEN' as const }
  const submission = state.submissions[activityId]
  const context = activityContext(state, activityId)
  const text = feedback.trim()
  if (!submission || !context.node || !context.plan || !canAccessRoom(user, context.plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (submission.status !== 'SUBMITTED' || !text) return { kind: 'VALIDATION' as const }
  const entry: FeedbackEntry = { id: `feedback-${randomUUID()}`, authorId: user.id, authorRole: user.role, text, version: submission.versions.at(-1)?.version ?? 1, createdAt: new Date().toISOString() }
  submission.status = 'RETURNED'
  submission.feedback = text
  submission.feedbackEntries = [...(submission.feedbackEntries ?? []), entry]
  state.auditEvents.push({ id: `audit-${randomUUID()}`, submissionId: activityId, action: 'RETURNED', actorId: user.id, createdAt: entry.createdAt })
  appendNotification(state, { id: `notification-${randomUUID()}`, type: 'WORK_RETURNED', title: '实践提交已退回', message: `你的“${context.node.title}”提交需要补充后再提交。`, targetRole: 'STUDENT', targetRoute: `/practicum/activities/${activityId}`, read: false, createdAt: entry.createdAt })
  writeState(state)
  return { kind: 'OK' as const, submission: clone(submission) }
}

export function gradeSubmission(user: AuthUser, activityId: string, input: { rubricScores: Record<string, number>; feedback: string }) {
  const state = readState()
  if (user.role !== 'OWNER') return { kind: 'FORBIDDEN' as const }
  const submission = state.submissions[activityId]
  const context = activityContext(state, activityId)
  if (!submission || !context.node || !context.plan || !context.activity || !canAccessRoom(user, context.plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (submission.status !== 'SUBMITTED' || context.activity.config.type !== 'PRACTICE_ACTIVITY' || !input.feedback.trim()) return { kind: 'VALIDATION' as const }
  const rubric = context.activity.config.rubric
  const missing = rubric.filter(item => item.required && input.rubricScores[item.id] === undefined)
  const invalid = rubric.some(item => input.rubricScores[item.id] !== undefined && (!Number.isFinite(input.rubricScores[item.id]) || input.rubricScores[item.id] < 0 || input.rubricScores[item.id] > item.maxScore))
  if (missing.length || invalid) return { kind: 'RUBRIC' as const }
  const now = new Date().toISOString()
  submission.status = 'GRADED'
  submission.grade = { reviewerId: user.id, rubricScores: input.rubricScores, feedback: input.feedback.trim(), createdAt: now }
  state.auditEvents.push({ id: `audit-${randomUUID()}`, submissionId: activityId, action: 'GRADED', actorId: user.id, createdAt: now })
  appendNotification(state, { id: `notification-${randomUUID()}`, type: 'WORK_GRADED', title: '实践提交已评分', message: `你的“${context.node.title}”提交已完成评分。`, targetRole: 'STUDENT', targetRoute: `/practicum/activities/${activityId}`, read: false, createdAt: now })
  writeState(state)
  return { kind: 'OK' as const, submission: clone(submission) }
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

export function transitionPlan(user: AuthUser, planId: string, action: 'publish' | 'withdraw' | 'archive') {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (user.role !== 'OWNER') return { kind: 'FORBIDDEN' as const }
  if (action === 'publish' && plan.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (action === 'withdraw' && plan.status !== 'PUBLISHED') return { kind: 'STATE' as const }
  if (action === 'archive' && plan.status !== 'PUBLISHED') return { kind: 'STATE' as const }
  if (action === 'publish' && (!plan.title || !plan.description)) return { kind: 'VALIDATION' as const }
  plan.status = action === 'publish' ? 'PUBLISHED' : action === 'withdraw' ? 'DRAFT' : 'ARCHIVED'
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  writeState(state)
  return { kind: 'OK' as const, ...getPlan(user, planId)! }
}

export function batchPublishPlans(user: AuthUser, planIds: string[]) {
  const state = readState()
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  const uniqueIds = [...new Set(planIds.filter(Boolean))]
  if (!uniqueIds.length || uniqueIds.length > 50) return { kind: 'VALIDATION' as const }
  const plans = uniqueIds.map(id => state.plans.find(plan => plan.id === id))
  if (plans.some(plan => !plan || !canAccessRoom(user, plan!.roomId))) return { kind: 'NOT_FOUND' as const }
  if (plans.some(plan => plan!.status !== 'DRAFT' || !plan!.title.trim() || !plan!.description.trim())) return { kind: 'VALIDATION' as const }
  const now = new Date().toISOString()
  for (const plan of plans as PersistedPlan[]) {
    plan.status = 'PUBLISHED'
    plan.version += 1
    plan.updatedAt = now
  }
  writeState(state)
  return { kind: 'OK' as const, plans: clone(plans) }
}

export function createAdminNotification(user: AuthUser, input: { title: string; message: string; targetRole?: 'STUDENT'; targetRoute?: string }, idempotencyKey?: string) {
  const state = readState()
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  const title = input.title.trim()
  const message = input.message.trim()
  if (!title || !message || title.length > 120 || message.length > 2000) return { kind: 'VALIDATION' as const }
  if (idempotencyKey) {
    const existing = state.idempotency[`${user.id}:${idempotencyKey}`]
    if (existing) {
      const notification = state.notifications.find(item => item.id === existing.entityId)
      if (notification) return { kind: 'OK' as const, replayed: true, notification: clone(notification) }
    }
  }
  const notification: PracticumNotification = {
    id: `notification-${randomUUID()}`,
    type: 'PLAN_PUBLISHED',
    title,
    message,
    targetRole: input.targetRole ?? 'STUDENT',
    targetRoute: input.targetRoute?.trim() || '/practicum/tasks',
    read: false,
    createdAt: new Date().toISOString(),
  }
  appendNotification(state, notification)
  if (idempotencyKey) state.idempotency[`${user.id}:${idempotencyKey}`] = { userId: user.id, method: 'POST', path: '/notifications', entityId: notification.id }
  writeState(state)
  return { kind: 'OK' as const, replayed: false, notification: clone(notification) }
}
