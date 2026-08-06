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
    return await $fetch<{ items: Array<{ id: string; planAssignmentId: string; activityId: string; status: string; availability: string; availableAt: string; dueAt: string | null; source: { id: string; title: string; status: string } }> }>('/api/practicum/student/tasks')
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

  async function recordTaskHeartbeat(taskId: string, eventType: 'HEARTBEAT' | 'VISIBILITY_VISIBLE' | 'VISIBILITY_HIDDEN') {
    return await $fetch<{ ok: true }>(`/api/practicum/student-tasks/${encodeURIComponent(taskId)}/heartbeat`, { method: 'POST', headers: useCsrfHeaders(), body: { eventType } })
  }

  type StudentTaskSubmission = { id: string; currentVersion: number; submittedAt: string | null; versions: Array<{ id: string; version: number; text: string; submittedAt: string }> }
  async function getStudentTask(taskId: string) {
    return await $fetch<{ task: { id: string; status: string }; submission: StudentTaskSubmission | null }>(`/api/practicum/student-tasks/${encodeURIComponent(taskId)}`)
  }
  async function submitStudentTask(taskId: string, text: string) {
    return await $fetch<{ task: { id: string; status: string }; submission: StudentTaskSubmission }>(`/api/practicum/student-tasks/${encodeURIComponent(taskId)}/submissions`, { method: 'POST', headers: useCsrfHeaders({ 'Idempotency-Key': `student-task-${taskId}-${crypto.randomUUID()}` }), body: { text } })
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

  return { listPlans, getPlan, listNotifications, markNotificationRead, listSubmissions, getSubmission, submitPractice, returnSubmission, gradeSubmission, getStats, getProgress, listStudentTasks, listClasses, listCohorts, createClass, listEnrollments, enrollStudent, listStudentRoster, listClassAssignments, publishClassAssignment, recordTaskHeartbeat, getStudentTask, submitStudentTask, getAnalytics, getMemberAnalytics, listMemberAchievementAnalytics, listRoomMembers, updateRoomMember, removeRoomMember }
}
