import type { PracticeSubmissionState, ReviewQueueItem, CurriculumNode, Activity } from '~/domain/practicum/types'

export interface SubmissionDetail {
  submission: PracticeSubmissionState
  node: CurriculumNode
  activity: Activity
}

export function usePracticumServer() {
  async function listSubmissions(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return await $fetch<{ items: ReviewQueueItem[]; total: number }>(`/api/practicum/submissions${query}`)
  }

  async function getSubmission(activityId: string) {
    return await $fetch<SubmissionDetail>(`/api/practicum/submissions/${encodeURIComponent(activityId)}`)
  }

  async function submitPractice(activityId: string, text: string) {
    return await $fetch<{ submission: PracticeSubmissionState }>('/api/practicum/submissions', {
      method: 'POST',
      headers: { 'Idempotency-Key': `practice-${activityId}-${Date.now()}` },
      body: { activityId, text },
    })
  }

  async function returnSubmission(activityId: string, feedback: string) {
    return await $fetch<{ submission: PracticeSubmissionState }>(`/api/practicum/submissions/${encodeURIComponent(activityId)}/return`, {
      method: 'POST',
      body: { feedback },
    })
  }

  async function gradeSubmission(activityId: string, rubricScores: Record<string, number>, feedback: string) {
    return await $fetch<{ submission: PracticeSubmissionState }>(`/api/practicum/submissions/${encodeURIComponent(activityId)}/grade`, {
      method: 'POST',
      body: { rubricScores, feedback },
    })
  }

  async function getStats(roomId: string) {
    return await $fetch<{ stats: Record<string, number> }>(`/api/practicum/stats?roomId=${encodeURIComponent(roomId)}`)
  }

  return { listSubmissions, getSubmission, submitPractice, returnSubmission, gradeSubmission, getStats }
}
