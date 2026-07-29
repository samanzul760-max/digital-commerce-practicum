<template>
  <ClientOnly>
    <PracticumShell :context-title="canView ? activityNode?.title ?? '提交详情' : '提交不可访问'" :context-meta="canView ? '审核详情' : ''">
      <p v-if="isLoading" data-loading class="empty-state">正在加载提交详情...</p>
      <p v-else-if="!canReview(store.state.activeRole)" data-forbidden class="empty-state">你没有查看或审核该提交的权限。</p>
      <p v-else-if="loadError" data-submission-error class="empty-state" role="alert">提交详情加载失败，请刷新重试。</p>
      <p v-else-if="!submission || !activityNode" data-empty class="empty-state">提交记录未找到。</p>

      <div v-else data-submission-detail>
        <div class="plan-header">
          <div>
            <NuxtLink to="/practicum/reviews" class="text-link">返回审核队列</NuxtLink>
            <p class="eyebrow">{{ submission.studentLabel ?? '学生 001' }}</p>
            <h1>{{ activityNode.title }}</h1>
          </div>
          <span data-detail-status class="status-pill" :class="submission.status === 'RETURNED' ? 'status-pill-orange' : ''">{{ statusLabel }}</span>
        </div>

        <section class="form-panel">
          <h2>提交内容</h2>
          <div data-version-history class="plan-list">
            <article v-for="version in submission.versions" :key="version.id" data-history-version class="plan-row">
              <div><strong>版本 {{ version.version }}</strong><span>{{ version.text }}</span></div>
              <time>{{ formatTime(version.submittedAt) }}</time>
            </article>
          </div>
        </section>

        <section class="form-panel">
          <h2>审核反馈</h2>
          <div v-if="submission.feedbackEntries?.length" data-feedback-history class="plan-list">
            <article v-for="entry in submission.feedbackEntries" :key="entry.id" class="plan-row">
              <div><strong>版本 {{ entry.version }}</strong><span>{{ entry.text }}</span></div>
              <time>{{ formatTime(entry.createdAt) }}</time>
            </article>
          </div>
          <p v-else class="empty-state">暂无审核反馈。</p>
        </section>

        <section v-if="submission.grade" data-grade-summary class="form-panel">
          <h2>最终评分</h2>
          <div class="plan-list">
            <article v-for="dimension in gradedDimensions" :key="dimension.id" class="plan-row">
              <div><strong>{{ dimension.label }}</strong><span>{{ dimension.score }} / {{ dimension.maxScore }}</span></div>
            </article>
          </div>
          <p>{{ submission.grade.feedback }}</p>
          <p>审核者：<strong data-grade-reviewer>OWNER</strong></p>
          <time data-grade-time>{{ formatTime(submission.grade.createdAt) }}</time>
        </section>

        <section v-if="submission.status === 'GRADED'" data-graded-indicator class="form-panel" style="background: var(--practicum-teal-soft); border-color: var(--practicum-teal);">
          <p><strong>此提交已定稿。</strong>评分和反馈为最终结果，不可修改。</p>
        </section>

        <section v-if="submission.status === 'SUBMITTED'" class="form-panel">
          <h2>退回修改</h2>
          <label class="field">退回反馈
            <textarea v-model="returnFeedback" data-return-feedback rows="4" placeholder="写明需要修改的内容"></textarea>
          </label>
          <p v-if="returnError" data-return-feedback-error class="empty-state" role="alert">{{ returnError }}</p>
          <button data-return-action type="button" class="danger-button" @click="requestReturn">退回修改</button>

          <div v-if="showReturnConfirmation" data-return-confirmation class="risk-zone">
            <h2>确认退回</h2>
            <p>{{ submission.studentLabel ?? '学生 001' }} · {{ activityNode.title }} · 版本 {{ latestVersion?.version }}</p>
            <p>退回后学生可以基于此反馈提交新版本，当前版本会保留。</p>
            <div class="form-actions">
              <button data-confirm-return type="button" class="danger-button" :disabled="returnPending" @click="confirmReturn">{{ returnPending ? '处理中...' : '确认退回' }}</button>
              <button type="button" class="secondary-button" @click="showReturnConfirmation = false">取消</button>
            </div>
          </div>
        </section>

        <section v-if="submission.status === 'SUBMITTED'" data-rubric-editor class="form-panel">
          <h2>最终评分</h2>
          <div class="rubric-grid">
            <label v-for="dimension in rubricDimensions" :key="dimension.id" class="field">
              {{ dimension.label }}（满分 {{ dimension.maxScore }}）
              <input
                v-model.number="rubricScores[dimension.id]"
                :data-rubric-score="dimension.id"
                type="number"
                min="0"
                :max="dimension.maxScore"
              >
            </label>
          </div>
          <label class="field">评分反馈
            <textarea v-model="gradeFeedback" rows="4" placeholder="写明评分依据和后续建议"></textarea>
          </label>
          <p v-if="gradeError" data-grade-error class="empty-state" role="alert">{{ gradeError }}</p>
          <button data-finalize-grade type="button" class="primary-button" @click="requestGrade">最终评分</button>

          <div v-if="showGradeConfirmation" data-grade-confirmation class="risk-zone">
            <h2>确认最终评分</h2>
            <p v-for="dimension in scoredDimensions" :key="dimension.id">{{ dimension.label }}：{{ dimension.score }} / {{ dimension.maxScore }}</p>
            <p><strong>总分：{{ totalScore }}</strong></p>
            <p>审核者：OWNER</p>
            <p>确认后评分将作为不可变审核证据保存。</p>
            <div class="form-actions">
              <button data-confirm-grade type="button" class="primary-button" :disabled="gradePending" @click="confirmGrade">{{ gradePending ? '处理中...' : '确认评分' }}</button>
              <button type="button" class="secondary-button" @click="showGradeConfirmation = false">取消</button>
            </div>
          </div>
        </section>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { canReview } from '~/domain/practicum/permissions'
import { usePracticumServer } from '~/composables/usePracticumServer'

const route = useRoute()
const store = usePracticumStore()
const server = usePracticumServer()
const isLoading = ref(true)
const loadError = ref(false)
const serverDetail = ref<Awaited<ReturnType<typeof server.getSubmission>> | null>(null)
onMounted(async () => {
  try {
    serverDetail.value = await server.getSubmission(route.params.submissionId as string)
  } catch (error: unknown) {
    const status = (error as { status?: number }).status
    if (status && status >= 500) loadError.value = true
  } finally {
    isLoading.value = false
  }
})
const submissionId = computed(() => route.params.submissionId as string)
const submission = computed(() => serverDetail.value?.submission ?? null)
const activityNode = computed(() => serverDetail.value?.node ?? null)
const activity = computed(() => serverDetail.value?.activity ?? null)
const canView = computed(() => canReview(store.state.activeRole) && Boolean(submission.value && activityNode.value))
const latestVersion = computed(() => submission.value?.versions.at(-1))
const rubricDimensions = computed(() => activity.value?.config.type === 'PRACTICE_ACTIVITY' ? activity.value.config.rubric : [])
const scoredDimensions = computed(() => rubricDimensions.value
  .filter(dimension => rubricScores.value[dimension.id] !== undefined)
  .map(dimension => ({ ...dimension, score: rubricScores.value[dimension.id] as number })))
const gradedDimensions = computed(() => rubricDimensions.value
  .filter(dimension => submission.value?.grade?.rubricScores[dimension.id] !== undefined)
  .map(dimension => ({ ...dimension, score: submission.value!.grade!.rubricScores[dimension.id] })))
const totalScore = computed(() => scoredDimensions.value.reduce((sum, dimension) => sum + dimension.score, 0))
const statusLabel = computed(() => submission.value?.status === 'RETURNED' ? '已退回' : submission.value?.status === 'GRADED' ? '已评分' : '待审核')
const returnFeedback = ref('')
const returnError = ref('')
const showReturnConfirmation = ref(false)
const rubricScores = ref<Record<string, number | undefined>>({})
const gradeFeedback = ref('')
const gradeError = ref('')
const showGradeConfirmation = ref(false)
const returnPending = ref(false)
const gradePending = ref(false)

function requestReturn() {
  if (!returnFeedback.value.trim()) {
    returnError.value = '请输入退回反馈。'
    setTimeout(() => {
      const ta = document.querySelector('[data-return-feedback]') as HTMLTextAreaElement | null
      ta?.focus()
    }, 50)
    return
  }
  returnError.value = ''
  showReturnConfirmation.value = true
}

async function confirmReturn() {
  if (returnPending.value) return
  returnPending.value = true
  try {
    if (!serverDetail.value) throw new Error('submission is not loaded')
    const result = await server.returnSubmission(submissionId.value, returnFeedback.value)
    serverDetail.value = { ...serverDetail.value, submission: result.submission }
    showReturnConfirmation.value = false
    returnFeedback.value = ''
  } catch {
    returnError.value = '退回失败，请刷新后重试。'
  }
  returnPending.value = false
}

function requestGrade() {
  const missing = rubricDimensions.value
    .filter(dimension => dimension.required && rubricScores.value[dimension.id] === undefined)
    .map(dimension => dimension.label)
  gradeError.value = missing.length ? `请完成必评项：${missing.join('、')}` : ''
  showGradeConfirmation.value = missing.length === 0
}

async function confirmGrade() {
  if (gradePending.value) return
  gradePending.value = true
  const scores = Object.fromEntries(scoredDimensions.value.map(dimension => [dimension.id, dimension.score]))
  try {
    if (!serverDetail.value) throw new Error('submission is not loaded')
    const result = await server.gradeSubmission(submissionId.value, scores, gradeFeedback.value)
    serverDetail.value = { ...serverDetail.value, submission: result.submission }
    showGradeConfirmation.value = false
  } catch {
    gradeError.value = '评分失败，请检查评分项和网络后重试。'
  }
  gradePending.value = false
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}
</script>

<style scoped>
.risk-zone { margin-top: 16px; }
.rubric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
time { color: var(--practicum-muted); font-size: 12px; }

@media (max-width: 780px) {
  .rubric-grid { grid-template-columns: 1fr; }
}
</style>
