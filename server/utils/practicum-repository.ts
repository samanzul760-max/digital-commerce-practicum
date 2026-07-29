import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { seedActivities } from '../../data/practicum/activity-seed'
import { commerceCaseActivities, commerceCaseNodes } from '../../data/practicum/commerce-case-seed'
import { seedNodes, seedOrganizations, seedPlans, seedRooms } from '../../data/practicum/seed'
import type { Activity, CurriculumNode, Organization, Plan, PlanStatus, PrototypeMember, PracticumNotification, ResourceKind, SupportingResource, PracticeSubmissionState, SubmissionVersion, ReviewQueueItem, FeedbackEntry } from '../../domain/practicum/types'
import type { AuthUser } from './auth-store'

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
  members: PrototypeMember[]
  notifications: PracticumNotification[]
  assets: StoredAsset[]
  submissions: Record<string, PracticeSubmissionState>
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
    members: [{ id: 'member-001', label: '学生 001', role: 'STUDENT', group: '未分组' }],
    notifications: [],
    assets: [],
    submissions: {},
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
        submissions: parsed.submissions ?? defaults.submissions,
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

export function deleteCurriculumNode(user: AuthUser, planId: string, nodeId: string, input: { version?: number }) {
  const state = readState()
  const plan = state.plans.find(item => item.id === planId)
  if (!plan || !canAccessRoom(user, plan.roomId)) return { kind: 'NOT_FOUND' as const }
  if (!ownerOnly(user)) return { kind: 'FORBIDDEN' as const }
  if (plan.status !== 'DRAFT') return { kind: 'STATE' as const }
  if (!Number.isInteger(input.version)) return { kind: 'VALIDATION' as const }
  if (input.version !== plan.version) return { kind: 'CONFLICT' as const, currentVersion: plan.version }
  const index = state.nodes.findIndex(item => item.id === nodeId && item.planId === planId)
  if (index < 0) return { kind: 'NOT_FOUND' as const }
  if (state.nodes.some(item => item.parentId === nodeId)) return { kind: 'STATE' as const }

  state.nodes.splice(index, 1)
  plan.version += 1
  plan.updatedAt = new Date().toISOString()
  writeState(state)
  return { kind: 'OK' as const, ...getPlan(user, planId)! }
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

export function listSubmissions(user: AuthUser, input: { status?: string; page: number; pageSize: number }) {
  const state = readState()
  if (user.role !== 'OWNER') return { forbidden: true as const }
  const items: ReviewQueueItem[] = Object.entries(state.submissions).flatMap(([activityId, submission]) => {
    const context = activityContext(state, activityId)
    const version = submission.versions.at(-1)
    const unit = context.node?.parentId ? state.nodes.find(item => item.id === context.node!.parentId) : undefined
    if (!context.node || !context.plan || !version || !unit || !canAccessRoom(user, context.plan.roomId)) return []
    if (input.status && submission.status !== input.status) return []
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
  return { kind: 'OK' as const, submission: clone(submission), node: clone(context.node), activity: clone(context.activity) }
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
