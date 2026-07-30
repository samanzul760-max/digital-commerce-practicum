import type { PracticeSubmissionState, ReviewQueueItem, CurriculumNode, Activity, AuditEvent } from '~/domain/practicum/types'

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
}

export function usePracticumServer() {
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

  async function getAnalytics(roomId: string) {
    return await $fetch<PracticumAnalytics>(`/api/practicum/analytics?roomId=${encodeURIComponent(roomId)}`)
  }

  async function getMemberAnalytics(memberId: string, roomId: string) {
    return await $fetch<PracticumMemberAnalyticsDetail>(`/api/practicum/analytics/members/${encodeURIComponent(memberId)}?roomId=${encodeURIComponent(roomId)}`)
  }

  return { listSubmissions, getSubmission, submitPractice, returnSubmission, gradeSubmission, getStats, getAnalytics, getMemberAnalytics }
}
