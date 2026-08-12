import type { PracticeSubmissionState, ReviewQueueItem, CurriculumNode, Activity, AuditEvent, Plan, PracticumNotification, PlanStatus } from '~/domain/practicum/types'

export interface PaginatedPlans {
  items: Plan[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface NotificationResponse {
  items: PracticumNotification[]
  unread: number
}

export interface PlanDetailResponse {
  plan: Plan
  nodes: CurriculumNode[]
  activities: Activity[]
}

export interface SubmissionDetail {
  submission: PracticeSubmissionState
  node: CurriculumNode
  activity: Activity
  auditEvents: AuditEvent[]
}

export interface SubmissionQuery {
  status?: string
  planId?: string
  unitId?: string
  student?: string
  sort?: 'oldest' | 'newest'
  pageSize?: number
}

export interface PracticumAnalytics {
  overview: { totalLearners: number; completedLearners: number; inactiveLearners: number; overallCompletionPercent: number }
  plans: { planId: string; title: string; status: string; learnerCount: number; percent: number }[]
  activityFeed: { learnerLabel: string; activityId: string; activityTitle: string; eventType: string; timestamp: string }[]
  ranking: { studentId: string; learnerLabel: string; gradedCount: number; avgScore: number }[]
}

export interface PracticumMemberAnalytics {
  memberId: string
  learnerLabel: string
  groupLabel?: string
  isDemo?: boolean
  completionPercent: number
  gradedCount: number
  avgScore: number
}

export interface AdminAchievementAnalytics {
  summary: {
    learnerCount: number
    averageCompletionPercent: number
    completedTaskCount: number
    pendingReviewCount: number
  }
  groups: Array<{ groupLabel: string; learnerCount: number; averageCompletionPercent: number; completedTaskCount: number }>
  items: PracticumMemberAnalytics[]
  skillDimensions: Array<{ skill: string; score: number }>
}

export interface PracticumMemberAnalyticsDetail {
  member: PracticumMemberAnalytics
  plans: { planId: string; title: string; activityCount: number; gradedCount: number; completionPercent: number }[]
  skillMap: PracticumSkillMapItem[]
  strengths: PracticumSkillMapItem[]
  improvements: PracticumSkillMapItem[]
}

export interface PracticumSkillMapItem {
  skill: string
  score: number
  mastery: 'MASTERED' | 'DEVELOPING' | 'NEEDS_SUPPORT'
  explanation: string
}

export interface PracticumRoomMember {
  id: string
  label: string
  role: 'OWNER' | 'STUDENT'
  group: string
  isDemo: boolean
}

export interface PracticumRoomMembersResponse {
  items: PracticumRoomMember[]
  groups: Array<{ id: string; name: string; memberCount: number }>
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PracticumClass {
  id: string
  organizationId: string
  roomId: string
  cohortId: string
  name: string
  cohort?: { id: string; name: string }
}

export interface PracticumCohort {
  id: string
  name: string
  startsAt: string
  endsAt: string
}

export interface ClassEnrollment {
  id: string
  classId: string
  userId: string
  role: string
  active: boolean
}

export interface ClassAssignment {
  id: string
  planId: string
  title: string
  status: string
  availableAt: string
  dueAt: string | null
  lateAllowed: boolean
  taskCount: number
  submittedCount: number
  gradedCount: number
}

export interface TeacherAnnouncement {
  id: string
  classId: string
  title: string
  body: string
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
  publishedAt: string | null
  closedAt: string | null
}

export interface TeachingSessionSummary {
  id: string
  classId: string
  currentActivityId: string | null
  status: 'ACTIVE' | 'ENDED'
  startedAt: string
  endedAt: string | null
}

export interface PracticumTemplateSummary {
  id: string
  roomId: string
  title: string
  description: string
  enabled: boolean
  updatedAt: string
}

export interface CompetitionSummary {
  id: string
  roomId: string
  title: string
  description: string
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
  createdAt: string
  myEntry: { registeredAt: string; submittedAt?: string } | null
}

export function usePracticumServer() {
  async function listPlans(input: { keyword?: string; status?: PlanStatus; page?: number; pageSize?: number; sort?: 'createdAt' | 'updatedAt' | 'title'; direction?: 'asc' | 'desc' } = {}) {
    const query = new URLSearchParams(Object.entries(input)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)])).toString()
    return await $fetch<PaginatedPlans>(`/api/practicum/plans${query ? `?${query}` : ''}`)
  }

  async function getPlan(planId: string) {
    return await $fetch<PlanDetailResponse>(`/api/practicum/plans/${encodeURIComponent(planId)}`)
  }

  async function listNotifications() {
    return await $fetch<NotificationResponse>('/api/practicum/notifications')
  }

  async function markNotificationRead(notificationId: string) {
    return await $fetch<{ ok: true }>(`/api/practicum/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'POST',
      headers: useCsrfHeaders(),
    })
  }

  async function listSubmissions(input: SubmissionQuery = {}) {
    const query = new URLSearchParams(Object.entries(input)
      .filter(([, value]) => value)
      .map(([key, value]) => [key, String(value)])).toString()
    return await $fetch<{ items: ReviewQueueItem[]; total: number }>(`/api/practicum/submissions${query ? `?${query}` : ''}`)
  }

  async function getSubmission(activityId: string) {
    return await $fetch<SubmissionDetail>(`/api/practicum/submissions/${encodeURIComponent(activityId)}`)
  }

  async function submitPractice(activityId: string, text: string) {
    return await $fetch<{ submission: PracticeSubmissionState }>('/api/practicum/submissions', {
      method: 'POST',
      headers: useCsrfHeaders({ 'Idempotency-Key': `practice-${activityId}-${Date.now()}` }),
      body: { activityId, text },
    })
  }

  async function returnSubmission(activityId: string, feedback: string) {
    return await $fetch<{ submission: PracticeSubmissionState }>(`/api/practicum/submissions/${encodeURIComponent(activityId)}/return`, {
      method: 'POST',
      headers: useCsrfHeaders(),
      body: { feedback },
    })
  }

  async function gradeSubmission(activityId: string, rubricScores: Record<string, number>, feedback: string) {
    return await $fetch<{ submission: PracticeSubmissionState }>(`/api/practicum/submissions/${encodeURIComponent(activityId)}/grade`, {
      method: 'POST',
      headers: useCsrfHeaders(),
      body: { rubricScores, feedback },
    })
  }

  async function getStats(roomId: string) {
    return await $fetch<{ stats: Record<string, number> }>(`/api/practicum/stats?roomId=${encodeURIComponent(roomId)}`)
  }

  async function getProgress(roomId: string, role: string) {
    return await $fetch<{ plans: Array<{ id: string; title: string; status: string; total: number; completed: number; graded: number; percent: number; nextTaskId: string | null; averageScore: number | null }>; totals: { total: number; completed: number; percent: number } }>(`/api/practicum/progress?roomId=${encodeURIComponent(roomId)}&role=${encodeURIComponent(role)}`)
  }

  async function listStudentTasks() {
    return await $fetch<{ items: Array<{ id: string; planAssignmentId: string; planId: string; activityId: string; status: string; availability: string; availableAt: string; dueAt: string | null; activity: { id: string; title: string }; source: { id: string; title: string; status: string } }> }>('/api/practicum/student/tasks')
  }

  async function listClasses(organizationId: string, roomId: string) {
    return await $fetch<{ items: PracticumClass[] }>(`/api/practicum/classes?organizationId=${encodeURIComponent(organizationId)}&roomId=${encodeURIComponent(roomId)}`)
  }

  async function listCohorts(organizationId: string, roomId: string) {
    return await $fetch<{ items: PracticumCohort[] }>(`/api/practicum/cohorts?organizationId=${encodeURIComponent(organizationId)}&roomId=${encodeURIComponent(roomId)}`)
  }

  async function createClass(input: { organizationId: string; roomId: string; cohortId: string; name: string }) {
    return await $fetch<{ class: PracticumClass }>('/api/practicum/classes', { method: 'POST', headers: useCsrfHeaders(), body: input })
  }

  async function listEnrollments(classId: string) {
    return await $fetch<{ items: ClassEnrollment[] }>(`/api/practicum/classes/${encodeURIComponent(classId)}/enrollments`)
  }

  async function enrollStudent(classId: string, userId: string) {
    return await $fetch<{ enrollment: ClassEnrollment }>(`/api/practicum/classes/${encodeURIComponent(classId)}/enrollments`, { method: 'POST', headers: useCsrfHeaders(), body: { userId, role: 'STUDENT' } })
  }

  async function listStudentRoster(organizationId: string, roomId: string) {
    return await $fetch<{ items: Array<{ id: string; displayLabel: string }> }>(`/api/practicum/roster/students?organizationId=${encodeURIComponent(organizationId)}&roomId=${encodeURIComponent(roomId)}`)
  }

  async function listClassAssignments(classId: string) {
    return await $fetch<{ items: ClassAssignment[] }>(`/api/practicum/classes/${encodeURIComponent(classId)}/assignments`)
  }

  async function publishClassAssignment(classId: string, input: { planId: string; title: string; activityIds: string[]; availableAt: string; dueAt?: string; lateAllowed?: boolean }) {
    return await $fetch<{ assignment: ClassAssignment; taskCount: number }>(`/api/practicum/classes/${encodeURIComponent(classId)}/assignments`, {
      method: 'POST',
      headers: useCsrfHeaders({ 'Idempotency-Key': `class-assignment-${crypto.randomUUID()}` }),
      body: input,
    })
  }

  async function listTeacherAnnouncements(classId: string) {
    return await $fetch<{ items: TeacherAnnouncement[] }>(`/api/practicum/teacher/classes/${encodeURIComponent(classId)}/announcements`)
  }

  async function listTeachingSessions(classId: string) {
    return await $fetch<{ items: TeachingSessionSummary[] }>(`/api/practicum/teacher/classes/${encodeURIComponent(classId)}/sessions`)
  }

  async function getTeachingExecution(sessionId: string) {
    return await $fetch<{ session: TeachingSessionSummary; execution: { total: number; notStarted: number; inProgress: number; completed: number } }>(`/api/practicum/teacher/sessions/${encodeURIComponent(sessionId)}/execution`)
  }

  async function getRoomOverview(roomId: string) {
    return await $fetch<{ overview: Record<string, number> }>(`/api/practicum/analytics/overview?roomId=${encodeURIComponent(roomId)}`)
  }

  async function listAuditEvents(roomId: string, input: { eventType?: string; entityType?: string; before?: string; limit?: number } = {}) {
    const query = new URLSearchParams([
      ['roomId', roomId],
      ...Object.entries(input)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)]),
    ]).toString()
    return await $fetch<{ items: Array<{ id: string; eventType: string; entityType: string; entityId: string; occurredAt: string }>; nextBefore: string | null }>(`/api/practicum/audit?${query}`)
  }

  async function listTemplates() {
    return await $fetch<{ items: PracticumTemplateSummary[] }>('/api/practicum/templates')
  }

  async function listCompetitions() {
    return await $fetch<{ items: CompetitionSummary[] }>('/api/practicum/competitions')
  }

  async function recordTaskHeartbeat(taskId: string, eventType: 'HEARTBEAT' | 'VISIBILITY_VISIBLE' | 'VISIBILITY_HIDDEN') {
    return await $fetch<{ ok: true }>(`/api/practicum/student-tasks/${encodeURIComponent(taskId)}/heartbeat`, { method: 'POST', headers: useCsrfHeaders(), body: { eventType } })
  }

  type StudentTaskSubmission = { id: string; currentVersion: number; submittedAt: string | null; versions: Array<{ id: string; version: number; text: string; submittedAt: string }>; grade: { score: string; feedback: string; gradedAt: string } | null }
  async function getStudentTask(taskId: string) {
    return await $fetch<{ task: { id: string; planId: string; activityId: string; activity: { id: string; title: string }; status: string; availability: string; availableAt: string; dueAt: string | null; source: { id: string; title: string; status: string } }; submission: StudentTaskSubmission | null; returnedFeedback: { feedback: string; returnedAt: string } | null }>(`/api/practicum/student-tasks/${encodeURIComponent(taskId)}`)
  }
  async function submitStudentTask(taskId: string, text: string) {
    return await $fetch<{ task: { id: string; status: string }; submission: StudentTaskSubmission }>(`/api/practicum/student-tasks/${encodeURIComponent(taskId)}/submissions`, { method: 'POST', headers: useCsrfHeaders({ 'Idempotency-Key': `student-task-${taskId}-${crypto.randomUUID()}` }), body: { text } })
  }

  type SoftwareLearningState = { type: 'SOFTWARE_ACTION'; completedStepIds: string[]; completedAt: string | null }
  type TrainingLearningState = { type: 'TRAINING'; maxAttempts: number; attempts: Array<{ answer: string; feedback: string; submittedAt: string }> }
  type StudentTaskLearningState = SoftwareLearningState | TrainingLearningState
  async function getStudentTaskLearningState(taskId: string) {
    return await $fetch<{ learningState: StudentTaskLearningState }>(`/api/practicum/student-tasks/${encodeURIComponent(taskId)}/learning-state`)
  }
  async function saveStudentTaskLearningState(taskId: string, input: { type: 'SOFTWARE_ACTION'; completedStepIds: string[]; complete?: boolean } | { type: 'TRAINING'; answer: string }) {
    return await $fetch<{ learningState: StudentTaskLearningState }>(`/api/practicum/student-tasks/${encodeURIComponent(taskId)}/learning-state`, { method: 'POST', headers: useCsrfHeaders(), body: input })
  }

  async function getAnalytics(roomId: string) {
    return await $fetch<PracticumAnalytics>(`/api/practicum/analytics?roomId=${encodeURIComponent(roomId)}`)
  }

  async function getMemberAnalytics(memberId: string, roomId: string) {
    return await $fetch<PracticumMemberAnalyticsDetail>(`/api/practicum/analytics/members/${encodeURIComponent(memberId)}?roomId=${encodeURIComponent(roomId)}`)
  }

  async function listMemberAchievementAnalytics(roomId: string) {
    return await $fetch<AdminAchievementAnalytics>(`/api/practicum/analytics/members?roomId=${encodeURIComponent(roomId)}`)
  }

  async function listRoomMembers(roomId: string) {
    return await $fetch<PracticumRoomMembersResponse>(`/api/practicum/members?roomId=${encodeURIComponent(roomId)}&pageSize=50`)
  }

  async function updateRoomMember(memberId: string, roomId: string, input: { group?: string; role?: 'OWNER' | 'STUDENT' }) {
    return await $fetch<{ member: PracticumRoomMember }>(`/api/practicum/members/${encodeURIComponent(memberId)}`, { method: 'PATCH', headers: useCsrfHeaders(), body: { roomId, ...input } })
  }

  async function removeRoomMember(memberId: string, roomId: string) {
    return await $fetch<{ ok: true }>(`/api/practicum/members/${encodeURIComponent(memberId)}?roomId=${encodeURIComponent(roomId)}`, { method: 'DELETE', headers: useCsrfHeaders() })
  }

  async function listProducts(storeId?: string) {
    const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
    return await $fetch<{ items: any[] }>(`/api/practicum/shop/products${q}`)
  }

  async function listFreightTemplates(storeId?: string) {
    const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''
    return await $fetch<{ items: any[] }>(`/api/practicum/shop/freight-templates${q}`)
  }

  return { listPlans, getPlan, listNotifications, markNotificationRead, listSubmissions, getSubmission, submitPractice, returnSubmission, gradeSubmission, getStats, getProgress, listStudentTasks, listClasses, listCohorts, createClass, listEnrollments, enrollStudent, listStudentRoster, listClassAssignments, publishClassAssignment, listTeacherAnnouncements, listTeachingSessions, getTeachingExecution, getRoomOverview, listAuditEvents, listTemplates, listCompetitions, recordTaskHeartbeat, getStudentTask, submitStudentTask, getStudentTaskLearningState, saveStudentTaskLearningState, getAnalytics, getMemberAnalytics, listMemberAchievementAnalytics, listRoomMembers, updateRoomMember, removeRoomMember, listProducts, listFreightTemplates }
}
