import { reactive, readonly, ref } from 'vue'
import type { Activity, ActivityType, PracticumRole, Plan, TrainingRoom, CurriculumNode, ResourceKind, SupportingResource, PrototypeMember, SoftwareStep, RubricDimension, SoftwareAttempt, TrainingAttempt, PracticeSubmissionState, ReviewQueueItem, PracticumNotification } from '../domain/practicum/types'
import { seedPlans, seedRoom, seedNodes } from '../data/practicum/seed'
import { seedActivities } from '../data/practicum/activity-seed'
import { commerceCaseActivities, commerceCaseNodes, commerceCases } from '../data/practicum/commerce-case-seed'

interface PracticumState {
  schemaVersion: 1
  activeRole: PracticumRole | null
  learningPosition: Record<string, string>
  softwareAttempts: Record<string, SoftwareAttempt>
  trainingAttempts: Record<string, TrainingAttempt[]>
  practiceDrafts: Record<string, string>
  practiceSubmissions: Record<string, PracticeSubmissionState>
  planDeadlines: Record<string, string>
  lockedActivityIds: string[]
  notifications: PracticumNotification[]
  room: TrainingRoom
  plans: Plan[]
  nodes: CurriculumNode[]
  activities: Activity[]
  resources: SupportingResource[]
  members: PrototypeMember[]
}

const storageKey = 'digital-commerce-practicum.v1'
const storageError = ref<string | null>(null)

function loadStoredState(): { state: PracticumState | null; hadStoredData: boolean } {
  if (typeof window === 'undefined') return { state: null, hadStoredData: false }
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return { state: null, hadStoredData: false }
    const parsed = JSON.parse(raw) as Partial<PracticumState> | null
    if (!parsed || (parsed.schemaVersion !== undefined && parsed.schemaVersion !== 1)) {
      storageError.value = '你的工作数据版本不兼容。重置后将加载新的示例数据，所有自定义内容都会丢失。'
      return { state: null, hadStoredData: true }
    }
    return { state: { ...parsed, schemaVersion: 1 } as PracticumState, hadStoredData: true }
  } catch {
    storageError.value = '你的工作数据无法读取。重置后将加载新的示例数据。'
    return { state: null, hadStoredData: true }
  }
}

const loadResult = loadStoredState()
const stored = loadResult.state

const state = reactive<PracticumState>({
  schemaVersion: 1,
  activeRole: stored?.activeRole ?? null,
  learningPosition: stored?.learningPosition ?? {},
  softwareAttempts: stored?.softwareAttempts ?? {},
  trainingAttempts: stored?.trainingAttempts ?? {},
  practiceDrafts: stored?.practiceDrafts ?? {},
  practiceSubmissions: stored?.practiceSubmissions ?? {},
  planDeadlines: stored?.planDeadlines ?? { 'plan-wdds': new Date(Date.now() + 2 * 86400000).toISOString() },
  lockedActivityIds: stored?.lockedActivityIds ?? [],
  notifications: stored?.notifications ?? [],
  room: stored?.room ?? seedRoom,
  plans: stored?.plans ?? [...seedPlans],
  nodes: mergeById(stored?.nodes ?? [...seedNodes], commerceCaseNodes),
  activities: mergeById(stored?.activities?.length ? stored.activities : [...seedActivities], commerceCaseActivities),
  resources: stored?.resources ?? [],
  members: stored?.members ?? [{ id: 'member-001', label: '学生 001', role: 'STUDENT', group: '未分组' }],
})

// Link seed nodes to activities on first load
if (!stored) {
  for (const node of state.nodes) {
    if (node.id.startsWith('act-')) {
      node.activityId = 'activity-' + node.id
    }
  }
}

let nextPlanId = 3
let nextNodeId = 200
let nextActivityId = 100
let nextResourceId = 1
const submittedEvidenceActivityIds = new Set(['act-01-001'])

function mergeById<T extends { id: string }>(base: T[], additions: T[]): T[] {
  const seen = new Set(base.map(item => item.id))
  return [...base, ...additions.filter(item => !seen.has(item.id))]
}

export function usePracticumStore() {
  function persist() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: state.schemaVersion, activeRole: state.activeRole, learningPosition: state.learningPosition, softwareAttempts: state.softwareAttempts, trainingAttempts: state.trainingAttempts, practiceDrafts: state.practiceDrafts, practiceSubmissions: state.practiceSubmissions, planDeadlines: state.planDeadlines, lockedActivityIds: state.lockedActivityIds, notifications: state.notifications, room: state.room, plans: state.plans, nodes: state.nodes, activities: state.activities, resources: state.resources, members: state.members }))
    }
  }

  function resetDemo() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }
    storageError.value = null
    // Reset state to seeds
    state.activeRole = null
    state.learningPosition = {}
    state.softwareAttempts = {}
    state.trainingAttempts = {}
    state.practiceDrafts = {}
    state.practiceSubmissions = {}
    state.planDeadlines = { 'plan-wdds': new Date(Date.now() + 2 * 86400000).toISOString() }
    state.lockedActivityIds = []
    state.notifications = []
    state.room = { ...seedRoom }
    state.plans = [...seedPlans]
    state.nodes = [...seedNodes]
    state.nodes = mergeById(state.nodes, commerceCaseNodes)
    state.activities = mergeById([...seedActivities], commerceCaseActivities)
    state.resources = []
    state.members = [{ id: 'member-001', label: '学生 001', role: 'STUDENT', group: '未分组' }]
    // Re-link seed node activities
    for (const node of state.nodes) {
      if (node.id.startsWith('act-')) {
        node.activityId = 'activity-' + node.id
      }
    }
    persist()
  }
  function switchRole(role: PracticumRole) {
    state.activeRole = role
    persist()
  }

  function getPlanNodes(planId: string): CurriculumNode[] {
    return state.nodes.filter(n => n.planId === planId)
  }

  function visiblePlansFor(role: PracticumRole | null): Plan[] {
    if (!role) return []
    if (role === 'STUDENT') return state.plans.filter(plan => plan.status === 'PUBLISHED')
    return state.plans
  }

  function createPlan(input: { title: string; description: string }): Plan {
    const now = new Date().toISOString()
    const plan: Plan = {
      id: `plan-custom-${nextPlanId++}`,
      roomId: 'room-001',
      title: input.title,
      description: input.description,
      status: 'DRAFT',
      sort: state.plans.length + 1,
      moduleIds: [],
      createdAt: now,
      updatedAt: now,
    }
    state.plans.push(plan)
    persist()
    return plan
  }

  function addNode(input: { planId: string; parentId: string | null; level: 1 | 2 | 3; title: string; activityType?: ActivityType }): CurriculumNode {
    const siblings = state.nodes.filter(n => n.planId === input.planId && n.parentId === input.parentId)
    const nodeId = `node-custom-${nextNodeId++}`
    const node: CurriculumNode = {
      id: nodeId,
      planId: input.planId,
      parentId: input.parentId,
      level: input.level,
      title: input.title,
      description: '',
      sort: siblings.length + 1,
      activityType: input.activityType,
    }
    state.nodes.push(node)
    if (input.level === 1) {
      const plan = state.plans.find(p => p.id === input.planId)
      if (plan) plan.moduleIds.push(node.id)
    }
    if (input.level === 3 && input.activityType) {
      const activity: Activity = createDefaultActivity(input.activityType, input.title, nodeId)
      state.activities.push(activity)
      node.activityId = activity.id
    }
    persist()
    return node
  }

  function createDefaultActivity(type: ActivityType, title: string, _nodeId: string): Activity {
    const id = `activity-custom-${nextActivityId++}`
    const base = { id, type, title, objective: '', instructions: [], required: true, resourceIds: [] }
    switch (type) {
      case 'SOFTWARE_ACTION':
        return { ...base, config: { type: 'SOFTWARE_ACTION' as const, steps: [] } }
      case 'TRAINING':
        return { ...base, config: { type: 'TRAINING' as const, maxAttempts: 3 } }
      case 'PRACTICE_ACTIVITY':
        return { ...base, config: { type: 'PRACTICE_ACTIVITY' as const, deliverables: [], rubric: [] } }
    }
  }

  function getActivityByNodeId(nodeId: string): Activity | null {
    const node = state.nodes.find(n => n.id === nodeId)
    if (!node?.activityId) return null
    return state.activities.find(a => a.id === node.activityId) ?? null
  }

  function getCommerceCase(caseId: string) {
    return commerceCases.find(item => item.id === caseId) ?? null
  }

  function getCommerceCaseActivityNodeId(caseId: string): string | null {
    return getCommerceCase(caseId)?.submissionNodeId ?? null
  }

  function saveCaseDraft(caseId: string, text: string) {
    const nodeId = getCommerceCaseActivityNodeId(caseId)
    return nodeId ? savePracticeDraft(nodeId, text) : false
  }

  function submitCaseWork(caseId: string) {
    const nodeId = getCommerceCaseActivityNodeId(caseId)
    return nodeId ? submitPracticeWork(nodeId) : null
  }

  function addActivityStep(activityId: string, label: string, required: boolean) {
    const activity = state.activities.find(a => a.id === activityId)
    if (!activity || activity.config.type !== 'SOFTWARE_ACTION') return
    const step: SoftwareStep = { id: `step-${Date.now()}`, label, required }
    activity.config.steps.push(step)
    persist()
  }

  function removeActivityStep(activityId: string, stepId: string) {
    const activity = state.activities.find(a => a.id === activityId)
    if (!activity || activity.config.type !== 'SOFTWARE_ACTION') return
    activity.config.steps = activity.config.steps.filter(s => s.id !== stepId)
    persist()
  }

  function updateActivityStep(activityId: string, stepId: string, label: string, required: boolean) {
    const activity = state.activities.find(a => a.id === activityId)
    if (!activity || activity.config.type !== 'SOFTWARE_ACTION') return
    const step = activity.config.steps.find(s => s.id === stepId)
    if (step) { step.label = label; step.required = required; persist() }
  }

  function updateTrainingConfig(activityId: string, maxAttempts: number, timeLimitMinutes?: number) {
    const activity = state.activities.find(a => a.id === activityId)
    if (!activity || activity.config.type !== 'TRAINING') return
    activity.config.maxAttempts = maxAttempts
    activity.config.timeLimitMinutes = timeLimitMinutes
    persist()
  }

  function addDeliverable(activityId: string, label: string) {
    const activity = state.activities.find(a => a.id === activityId)
    if (!activity || activity.config.type !== 'PRACTICE_ACTIVITY') return
    activity.config.deliverables.push(label)
    persist()
  }

  function addRubricDimension(activityId: string, label: string, maxScore: number, required: boolean) {
    const activity = state.activities.find(a => a.id === activityId)
    if (!activity || activity.config.type !== 'PRACTICE_ACTIVITY') return
    const dim: RubricDimension = { id: `rubric-${Date.now()}`, label, maxScore, required }
    activity.config.rubric.push(dim)
    persist()
  }

  function removeRubricDimension(activityId: string, dimensionId: string) {
    const activity = state.activities.find(a => a.id === activityId)
    if (!activity || activity.config.type !== 'PRACTICE_ACTIVITY') return
    activity.config.rubric = activity.config.rubric.filter(d => d.id !== dimensionId)
    persist()
  }

  function getPlanResources(planId: string): SupportingResource[] {
    return state.resources.filter(resource => resource.planId === planId)
  }

  function addSupportingResource(input: { planId: string; name: string; kind: ResourceKind; url: string }): SupportingResource {
    const resource: SupportingResource = { id: `resource-custom-${nextResourceId++}`, ...input }
    state.resources.push(resource)
    persist()
    return resource
  }

  function removeResource(resourceId: string) {
    state.resources = state.resources.filter(r => r.id !== resourceId)
    persist()
  }

  function renameNode(nodeId: string, newTitle: string): CurriculumNode | null {
    const node = state.nodes.find(n => n.id === nodeId)
    if (node) { node.title = newTitle; persist() }
    return node ?? null
  }

  function reorderNode(nodeId: string, direction: 'up' | 'down') {
    const node = state.nodes.find(n => n.id === nodeId)
    if (!node) return
    const siblings = state.nodes
      .filter(n => n.planId === node.planId && n.parentId === node.parentId && n.level === node.level)
      .sort((a, b) => a.sort - b.sort)
    const idx = siblings.findIndex(s => s.id === nodeId)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= siblings.length) return
    const temp = siblings[idx].sort
    siblings[idx].sort = siblings[targetIdx].sort
    siblings[targetIdx].sort = temp
    persist()
  }

  function deleteNode(nodeId: string): { success: boolean; reason?: string } {
    const impact = getDeletionImpact(nodeId)
    if (impact.evidenceCount > 0) {
      return { success: false, reason: '该节点包含已提交证据，不能删除。' }
    }
    // Collect all descendant IDs
    const descendantIds = new Set<string>([nodeId])
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
    // Remove related activities
    const descendantNodeIds = [...descendantIds]
    state.activities = state.activities.filter(a => {
      const linkedNode = state.nodes.find(n => n.activityId === a.id)
      return linkedNode ? !descendantIds.has(linkedNode.id) : true
    })
    // Remove nodes
    state.nodes = state.nodes.filter(n => !descendantIds.has(n.id))
    // Update plan moduleIds
    for (const plan of state.plans) {
      plan.moduleIds = plan.moduleIds.filter(id => !descendantIds.has(id))
    }
    persist()
    return { success: true }
  }

  function getDeletionImpact(nodeId: string) {
    const descendantIds = new Set<string>([nodeId])
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
    const activityIds = state.nodes.filter(node => descendantIds.has(node.id) && node.level === 3).map(node => node.id)
    return { descendantCount: descendantIds.size - 1, activityCount: activityIds.length, evidenceCount: activityIds.filter(id => submittedEvidenceActivityIds.has(id)).length }
  }

  function validatePlanForPublish(planId: string): string[] {
    const plan = state.plans.find(item => item.id === planId)
    const errors: string[] = []
    if (!plan?.title.trim()) errors.push('缺少计划标题')
    if (!plan?.description.trim()) errors.push('缺少计划描述')
    if (!state.nodes.some(node => node.planId === planId && node.level === 1)) errors.push('至少需要配置一个一级目录')
    if (!state.nodes.some(node => node.planId === planId && node.level === 3)) errors.push('至少需要配置一个活动')
    // Check that each level-3 activity has config
    const activityNodes = state.nodes.filter(node => node.planId === planId && node.level === 3)
    for (const node of activityNodes) {
      const activity = node.activityId ? state.activities.find(a => a.id === node.activityId) : null
      if (!activity) {
        errors.push(`"${node.title}" 缺少活动配置`)
      }
    }
    return errors
  }

  function publishPlan(planId: string): { success: boolean; errors: string[] } {
    const errors = validatePlanForPublish(planId)
    if (errors.length > 0) return { success: false, errors }
    const plan = state.plans.find(item => item.id === planId)
    if (!plan || plan.status !== 'DRAFT') return { success: false, errors: ['计划状态不允许发布'] }
    plan.status = 'PUBLISHED'
    plan.updatedAt = new Date().toISOString()
    addNotification('PLAN_PUBLISHED', '新计划已发布', `"${plan.title}" 已发布，可以开始学习。`, 'STUDENT', '/practicum')
    persist()
    return { success: true, errors: [] }
  }

  function unpublishPlan(planId: string): boolean {
    const plan = state.plans.find(item => item.id === planId)
    if (!plan || plan.status !== 'PUBLISHED') return false
    plan.status = 'DRAFT'
    plan.updatedAt = new Date().toISOString()
    persist()
    return true
  }

  function updateMemberGroup(memberId: string, group: string) {
    const member = state.members.find(item => item.id === memberId)
    if (member) { member.group = group; persist() }
  }

  function updateMemberRole(memberId: string, role: 'OWNER' | 'STUDENT') {
    const member = state.members.find(item => item.id === memberId)
    if (member) { member.role = role; persist() }
  }

  function removeMember(memberId: string) {
    state.members = state.members.filter(m => m.id !== memberId)
    persist()
  }

  // Learning position
  function getLearningPosition(planId: string): string | null {
    const nodeId = state.learningPosition[planId]
    return state.nodes.some(node => node.id === nodeId && node.planId === planId && node.level === 3) ? nodeId : null
  }

  function setLearningPosition(planId: string, nodeId: string) {
    if (!state.nodes.some(node => node.id === nodeId && node.planId === planId && node.level === 3)) return
    state.learningPosition[planId] = nodeId
    persist()
  }

  function getSoftwareAttempt(nodeId: string): SoftwareAttempt {
    return state.softwareAttempts[nodeId] ?? { completedStepIds: [], updatedAt: '' }
  }

  function saveSoftwareSteps(nodeId: string, completedStepIds: string[]) {
    const activity = getActivityByNodeId(nodeId)
    if (state.activeRole !== 'STUDENT' || activity?.config.type !== 'SOFTWARE_ACTION') return
    const allowed = new Set(activity.config.steps.map(step => step.id))
    state.softwareAttempts[nodeId] = {
      completedStepIds: completedStepIds.filter(stepId => allowed.has(stepId)),
      updatedAt: new Date().toISOString(),
    }
    persist()
  }

  function completeSoftwareActivity(nodeId: string): { success: boolean; missing: string[] } {
    const activity = getActivityByNodeId(nodeId)
    if (state.activeRole !== 'STUDENT' || activity?.config.type !== 'SOFTWARE_ACTION') return { success: false, missing: [] }
    const attempt = getSoftwareAttempt(nodeId)
    const missing = activity.config.steps.filter(step => step.required && !attempt.completedStepIds.includes(step.id)).map(step => step.label)
    if (missing.length) return { success: false, missing }
    const now = new Date().toISOString()
    state.softwareAttempts[nodeId] = { ...attempt, completedAt: now, updatedAt: now }
    persist()
    return { success: true, missing: [] }
  }

  function resetSoftwareActivity(nodeId: string) {
    if (state.activeRole !== 'STUDENT' || !state.softwareAttempts[nodeId]) return
    delete state.softwareAttempts[nodeId]
    persist()
  }

  function submitTrainingAttempt(nodeId: string, answer: string) {
    const activity = getActivityByNodeId(nodeId)
    if (state.activeRole !== 'STUDENT' || activity?.config.type !== 'TRAINING' || !answer.trim()) return null
    const attempts = state.trainingAttempts[nodeId] ?? []
    if (attempts.length >= activity.config.maxAttempts) return null
    const text = answer.trim()
    const feedback = text.length < 5 ? '答案过于简短，请尝试更详细的回答。' : text.length > 20 ? '回答较为完整，包含了必要信息。请继续巩固相关知识点。' : '回答已记录。部分要点可以进一步展开。'
    const attempt = { answer: text, feedback, submittedAt: new Date().toISOString() }
    state.trainingAttempts[nodeId] = [...attempts, attempt]
    persist()
    return attempt
  }

  function savePracticeDraft(nodeId: string, text: string) {
    const activity = getActivityByNodeId(nodeId)
    if (state.activeRole !== 'STUDENT' || activity?.config.type !== 'PRACTICE_ACTIVITY') return false
    state.practiceDrafts[nodeId] = text
    persist()
    return true
  }

  function submitPracticeWork(nodeId: string) {
    const activity = getActivityByNodeId(nodeId)
    const text = state.practiceDrafts[nodeId]?.trim()
    if (state.activeRole !== 'STUDENT' || activity?.config.type !== 'PRACTICE_ACTIVITY' || !text) return null
    const current = state.practiceSubmissions[nodeId] ?? { status: 'NOT_STARTED' as const, versions: [] }
    if (!['NOT_STARTED', 'IN_PROGRESS', 'RETURNED'].includes(current.status)) return null
    const version = { id: `submission-${nodeId}-${current.versions.length + 1}`, submissionId: nodeId, version: current.versions.length + 1, text, links: [], attachments: [], submittedAt: new Date().toISOString() }
    state.practiceSubmissions[nodeId] = {
      ...current,
      studentId: current.studentId ?? 'student-001',
      studentLabel: current.studentLabel ?? '学生 001',
      status: 'SUBMITTED',
      versions: [...current.versions, version],
    }
    const node = state.nodes.find(n => n.id === nodeId)
    addNotification('NEW_SUBMISSION', '收到新提交', `学生提交了"${node?.title ?? '未知活动'}"，请前往审核。`, 'OWNER', '/practicum/reviews')
    persist()
    return version
  }

  function isActivityComplete(nodeId: string) {
    if (state.softwareAttempts[nodeId]?.completedAt) return true
    if ((state.trainingAttempts[nodeId]?.length ?? 0) > 0) return true
    return state.practiceSubmissions[nodeId]?.status === 'GRADED'
  }

  function getPlanProgress(planId: string) {
    const plan = state.plans.find(p => p.id === planId)
    if (!plan || plan.status !== 'PUBLISHED') return { total: 0, completed: 0, percent: 0 }
    const required = state.nodes.filter(node => {
      if (node.planId !== planId || node.level !== 3) return false
      const activity = getActivityByNodeId(node.id)
      // Nodes without explicit activity data default to required
      return !activity || activity.required
    })
    const completed = required.filter(node => isActivityComplete(node.id)).length
    return { total: required.length, completed, percent: required.length ? Math.round((completed / required.length) * 100) : 0 }
  }

  function getModuleProgress(moduleId: string) {
    const unitIds = new Set(state.nodes.filter(node => node.parentId === moduleId && node.level === 2).map(node => node.id))
    const activities = state.nodes.filter(node => node.level === 3 && node.parentId && unitIds.has(node.parentId) && getActivityByNodeId(node.id)?.required)
    const completed = activities.filter(node => isActivityComplete(node.id)).length
    return { total: activities.length, completed, percent: activities.length ? Math.round((completed / activities.length) * 100) : 0 }
  }

  function getNextStudentActivity(planId: string) {
    const activities = state.nodes.filter(node => node.planId === planId && node.level === 3)
    return activities.find(node => state.practiceSubmissions[node.id]?.status === 'RETURNED')
      ?? activities.find(node => node.id === state.learningPosition[planId] && !isActivityComplete(node.id))
      ?? activities.find(node => !isActivityComplete(node.id))
      ?? null
  }

  function getReviewQueue(): ReviewQueueItem[] {
    if (state.activeRole !== 'OWNER') return []
    return Object.entries(state.practiceSubmissions).flatMap(([nodeId, submission]) => {
      const version = submission.versions.at(-1)
      const node = state.nodes.find(item => item.id === nodeId)
      const unit = node ? state.nodes.find(item => item.id === node.parentId) : null
      const plan = node ? state.plans.find(item => item.id === node.planId) : null
      if (!version || !node || !unit || !plan) return []
      return [{
        submissionId: nodeId,
        studentId: submission.studentId ?? 'student-001',
        studentLabel: submission.studentLabel ?? '学生 001',
        planId: plan.id,
        planTitle: plan.title,
        unitId: unit.id,
        unitTitle: unit.title,
        activityId: node.id,
        activityTitle: node.title,
        version: version.version,
        submittedAt: version.submittedAt,
        status: submission.status,
        reviewScope: submission.reviewScope ?? 'PLAN',
      }]
    })
  }

  function returnPracticeWork(nodeId: string, feedback: string) {
    const submission = state.practiceSubmissions[nodeId]
    const latestVersion = submission?.versions.at(-1)
    const text = feedback.trim()
    if (state.activeRole !== 'OWNER' || submission?.status !== 'SUBMITTED' || !latestVersion || !text) return false
    const createdAt = new Date().toISOString()
    submission.status = 'RETURNED'
    submission.feedback = text
    submission.feedbackEntries = [
      ...(submission.feedbackEntries ?? []),
      {
        id: `feedback-${nodeId}-${(submission.feedbackEntries?.length ?? 0) + 1}`,
        authorId: 'owner-001',
        authorRole: 'OWNER',
        text,
        version: latestVersion.version,
        createdAt,
      },
    ]
    const node = state.nodes.find(n => n.id === nodeId)
    addNotification('WORK_RETURNED', '作业已退回', `你的"${node?.title ?? '未知活动'}"作业已被退回，请修改后重新提交。`, 'STUDENT', '/practicum/progress')
    persist()
    return true
  }

  function gradePracticeWork(nodeId: string, rubricScores: Record<string, number>, feedback: string) {
    const submission = state.practiceSubmissions[nodeId]
    const activity = getActivityByNodeId(nodeId)
    const text = feedback.trim()
    if (state.activeRole !== 'OWNER' || submission?.status !== 'SUBMITTED' || activity?.config.type !== 'PRACTICE_ACTIVITY' || !text) return false
    const rubric = activity.config.rubric
    const missingRequired = rubric.some(dimension => dimension.required && rubricScores[dimension.id] === undefined)
    const invalidScore = rubric.some(dimension => {
      const score = rubricScores[dimension.id]
      return score !== undefined && (!Number.isFinite(score) || score < 0 || score > dimension.maxScore)
    })
    if (missingRequired || invalidScore) return false
    submission.status = 'GRADED'
    submission.grade = {
      reviewerId: 'owner-001',
      rubricScores: { ...rubricScores },
      feedback: text,
      createdAt: new Date().toISOString(),
    }
    addNotification('WORK_GRADED', '作业已评分', `你的"${activity?.title ?? '未知活动'}"作业已完成评分。`, 'STUDENT', '/practicum/progress')
    persist()
    return true
  }

  function updateRoomSettings(input: { description: string; promotionalMediaUrl: string }) {
    state.room.description = input.description
    state.room.promotionalMediaUrl = input.promotionalMediaUrl
    persist()
  }

  // --- Notifications ---

  function notificationsUnread(): number {
    return state.notifications.filter(n => !n.read).length
  }

  function checkDeadlines() {
    const now = Date.now()
    const threeDays = 3 * 86400000
    for (const [planId, deadline] of Object.entries(state.planDeadlines)) {
      const deadlineTime = new Date(deadline).getTime()
      if (deadlineTime > now && deadlineTime - now <= threeDays) {
        const plan = state.plans.find(p => p.id === planId)
        if (plan && plan.status === 'PUBLISHED') {
          const daysLeft = Math.ceil((deadlineTime - now) / 86400000)
          addNotification(
            'DEADLINE_APPROACHING',
            '截止日期临近',
            `"${plan.title}" 的截止日期还有 ${daysLeft} 天，请及时完成学习任务。`,
            'STUDENT',
            `/practicum/learn/${planId}`
          )
        }
      }
    }
  }

  // Run deadline check on init
  checkDeadlines()

  function addNotification(type: PracticumNotification['type'], title: string, message: string, targetRole: PracticumRole, targetRoute: string) {
    // Idempotent: same type + message + targetRole + route = duplicate
    const exists = state.notifications.some(n =>
      n.type === type && n.message === message && n.targetRole === targetRole && n.targetRoute === targetRoute
    )
    if (exists) return
    state.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      message,
      targetRole,
      targetRoute,
      read: false,
      createdAt: new Date().toISOString(),
    })
    // Keep max 50 notifications
    if (state.notifications.length > 50) state.notifications.length = 50
    persist()
  }

  function markNotificationRead(id: string) {
    const n = state.notifications.find(x => x.id === id)
    if (n) { n.read = true; persist() }
  }

  function markAllNotificationsRead() {
    for (const n of state.notifications) n.read = true
    persist()
  }

  function notificationsForRole(role: PracticumRole) {
    return state.notifications.filter(n => n.targetRole === role)
  }

  function canAccessNotificationRoute(role: PracticumRole, route: string): boolean {
    // OWNER can access all routes
    if (role === 'OWNER') return true
    // STUDENT cannot access OWNER-only routes
    const ownerOnlyPrefixes = ['/practicum/reviews', '/practicum/data-center']
    for (const prefix of ownerOnlyPrefixes) {
      if (route.startsWith(prefix)) return false
    }
    // STUDENT cannot access plan edit routes
    if (route.includes('/edit')) return false
    // Check if route points to a draft plan
    const planMatch = route.match(/\/practicum\/(?:plans|learn)\/([^/]+)/)
    if (planMatch) {
      const planId = planMatch[1]
      const plan = state.plans.find(p => p.id === planId)
      if (plan && plan.status === 'DRAFT') return false
    }
    return true
  }

  function getStudentRubricResults(studentId: string): { nodeId: string; activityTitle: string; dimensions: { label: string; score: number; maxScore: number }[]; totalScore: number; maxTotal: number; feedback: string; gradedAt: string }[] {
    const results: ReturnType<typeof getStudentRubricResults> = []
    for (const [nodeId, submission] of Object.entries(state.practiceSubmissions)) {
      if (submission.studentId !== studentId || submission.status !== 'GRADED' || !submission.grade) continue
      const activity = getActivityByNodeId(nodeId)
      if (activity?.config.type !== 'PRACTICE_ACTIVITY') continue
      const rubric = activity.config.rubric
      const dimensions = rubric.map(d => ({
        label: d.label,
        score: submission.grade!.rubricScores[d.id] ?? 0,
        maxScore: d.maxScore,
      }))
      const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0)
      const maxTotal = dimensions.reduce((sum, d) => sum + d.maxScore, 0)
      results.push({
        nodeId,
        activityTitle: activity.title,
        dimensions,
        totalScore,
        maxTotal,
        feedback: submission.grade!.feedback,
        gradedAt: submission.grade!.createdAt,
      })
    }
    return results.sort((a, b) => b.gradedAt.localeCompare(a.gradedAt))
  }

  function getWeakRubricDimensions(): { label: string; avgPercent: number; submissionCount: number; activityTitle: string }[] {
    const dimensionStats: Record<string, { totalPct: number; count: number; activityTitle: string }> = {}
    for (const [nodeId, submission] of Object.entries(state.practiceSubmissions)) {
      if (submission.status !== 'GRADED' || !submission.grade) continue
      const activity = getActivityByNodeId(nodeId)
      if (activity?.config.type !== 'PRACTICE_ACTIVITY') continue
      for (const dim of activity.config.rubric) {
        const score = submission.grade.rubricScores[dim.id]
        if (score === undefined) continue
        if (!dimensionStats[dim.id]) {
          dimensionStats[dim.id] = { totalPct: 0, count: 0, activityTitle: activity.title }
        }
        dimensionStats[dim.id].totalPct += dim.maxScore > 0 ? (score / dim.maxScore) * 100 : 0
        dimensionStats[dim.id].count++
      }
    }
    const rows = Object.entries(dimensionStats).map(([dimId, stats]) => {
      // Find the dimension label from any activity
      let label = dimId
      for (const [nodeId, submission] of Object.entries(state.practiceSubmissions)) {
        if (submission.status !== 'GRADED' || !submission.grade) continue
        const activity = getActivityByNodeId(nodeId)
        if (activity?.config.type !== 'PRACTICE_ACTIVITY') continue
        const dim = activity.config.rubric.find(d => d.id === dimId)
        if (dim) { label = dim.label; break }
      }
      return {
        label,
        avgPercent: Math.round(stats.totalPct / stats.count),
        submissionCount: stats.count,
        activityTitle: stats.activityTitle,
      }
    })
    return rows.sort((a, b) => a.avgPercent - b.avgPercent)
  }

  function archivePlan(planId: string) {
    const plan = state.plans.find(item => item.id === planId)
    if (plan) {
      plan.status = 'ARCHIVED'
      plan.updatedAt = new Date().toISOString()
      persist()
    }
    return plan
  }

  return {
    state: readonly(state),
    storageError: readonly(storageError),
    resetDemo,
    switchRole,
    getPlanNodes,
    visiblePlansFor,
    createPlan,
    addNode,
    renameNode,
    reorderNode,
    getActivityByNodeId,
    getCommerceCase,
    getCommerceCaseActivityNodeId,
    addActivityStep,
    removeActivityStep,
    updateActivityStep,
    updateTrainingConfig,
    addDeliverable,
    addRubricDimension,
    removeRubricDimension,
    persist,
    getPlanResources,
    addSupportingResource,
    removeResource,
    deleteNode,
    getDeletionImpact,
    validatePlanForPublish,
    publishPlan,
    unpublishPlan,
    archivePlan,
    updateMemberGroup,
    updateMemberRole,
    removeMember,
    getLearningPosition,
    setLearningPosition,
    getSoftwareAttempt,
    saveSoftwareSteps,
    completeSoftwareActivity,
    resetSoftwareActivity,
    submitTrainingAttempt,
    savePracticeDraft,
    submitPracticeWork,
    saveCaseDraft,
    submitCaseWork,
    getPlanProgress,
    getModuleProgress,
    getNextStudentActivity,
    getReviewQueue,
    returnPracticeWork,
    gradePracticeWork,
    updateRoomSettings,
    isActivityComplete,
    getStudentRubricResults,
    getWeakRubricDimensions,
    notificationsUnread,
    addNotification,
    checkDeadlines,
    markNotificationRead,
    markAllNotificationsRead,
    notificationsForRole,
    canAccessNotificationRoute,
  }
}
