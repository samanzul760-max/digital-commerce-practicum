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
  completionPercent: number
  gradedCount: number
  avgScore: number
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
    return await $fetch<{ items: Array<{ id: string; activityId: string; status: string; availableAt: string; dueAt: string | null; planAssignment: { id: string; title: string; lateAllowed: boolean } }> }>('/api/practicum/student/tasks')
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

  return { listPlans, getPlan, listNotifications, markNotificationRead, listSubmissions, getSubmission, submitPractice, returnSubmission, gradeSubmission, getStats, getProgress, listStudentTasks, recordTaskHeartbeat, getStudentTask, submitStudentTask, getAnalytics, getMemberAnalytics }
}
