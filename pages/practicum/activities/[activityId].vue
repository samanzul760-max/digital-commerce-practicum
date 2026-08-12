<template>
  <ClientOnly>
    <PracticumShell :context-title="isPublishedStudentActivity ? activityNode?.title ?? '活动' : '活动不可访问'" :context-meta="isPublishedStudentActivity ? activityTypeLabel(activity?.type) : ''">
      <p v-if="isLoading" data-loading class="empty-state">正在加载活动...</p>

      <p v-else-if="isForbidden || !canSubmitWork(viewerRole) || (activityNode && activity && !isPublishedStudentActivity)" data-forbidden class="empty-state">当前活动不可访问。</p>

      <p v-else-if="loadError" data-server-error class="empty-state" role="alert">{{ loadError }}</p>

      <div v-else-if="!activityNode || !activity || !activityPlan" data-empty class="empty-state">活动未找到。</div>

      <div v-else-if="isLocked" data-locked class="empty-state">请先完成前置活动，再开始此任务。</div>

      <div v-else-if="isUnavailable" data-unavailable class="empty-state">{{ unavailableMessage }}</div>

      <div v-else data-activity-page>
        <div class="plan-header">
          <div>
            <button type="button" data-back-link class="text-link" @click="requestBack">返回课程</button>
            <p class="eyebrow">{{ activityTypeLabel(activity.type) }}</p>
            <h1>{{ activityNode.title }}</h1>
          </div>
          <span class="status-pill" :class="completionStatus === 'completed' ? '' : 'status-pill-orange'">
            {{ completionStatus === 'completed' ? '已完成' : '未完成' }}
          </span>
        </div>

        <div v-if="showUnsavedLeave" data-unsaved-leave class="form-panel">
          <p>当前成果尚未保存。你可以保存后离开、丢弃修改或继续编辑。</p>
          <div class="form-actions">
            <button data-save-leave class="primary-button" type="button" @click="saveAndLeave">保存并离开</button>
            <button data-discard-leave class="danger-button" type="button" @click="discardAndLeave">丢弃修改</button>
            <button data-cancel-leave class="secondary-button" type="button" @click="showUnsavedLeave = false">继续编辑</button>
          </div>
        </div>

        <section class="form-panel">
          <h2>活动目标</h2>
          <p>{{ activity.objective }}</p>
          <h2 v-if="activity.instructions.length">操作说明</h2>
          <ul v-if="activity.instructions.length">
            <li v-for="(inst, i) in activity.instructions" :key="i">{{ inst }}</li>
          </ul>
        </section>

        <!-- SOFTWARE_ACTION -->
        <section v-if="activity.config.type === 'SOFTWARE_ACTION'" data-software-activity class="form-panel">
          <h2>操作步骤</h2>
          <div v-for="step in activity.config.steps" :key="step.id" style="display:flex;align-items:center;gap:10px;min-height:44px;padding:6px 0;">
            <input
              data-step-checkbox
              type="checkbox"
              :checked="completedSteps.has(step.id)"
              @change="toggleStep(step.id)"
              style="width:44px;height:44px;"
            >
            <span>{{ step.label }}</span>
            <span v-if="step.required" class="status-pill status-pill-orange" style="font-size:11px;">必做</span>
          </div>

          <p v-if="incompleteError" data-incomplete-error class="empty-state" style="margin-top:12px;" role="alert">{{ incompleteError }}</p>

          <div class="form-actions">
            <button data-complete-software class="primary-button" type="button" @click="attemptComplete">完成操作</button>
            <button v-if="completionStatus === 'completed'" data-reset-software class="ghost-button" type="button" @click="showResetConfirm = true">重置操作</button>
          </div>

          <div v-if="showResetConfirm" data-reset-impact class="form-panel" style="margin-top:12px;">
            <p>重置将清除当前活动的所有步骤勾选记录，不会影响其他活动的进度。</p>
            <div class="form-actions">
              <button data-reset-confirm class="danger-button" type="button" @click="handleReset">确认重置</button>
              <button class="secondary-button" type="button" @click="showResetConfirm = false">取消</button>
            </div>
          </div>
        </section>

        <!-- TRAINING -->
        <section v-if="activity.config.type === 'TRAINING'" data-training-activity class="form-panel">
          <h2>训练答题</h2>
          <p v-if="activity.config.timeLimitMinutes" style="color:var(--practicum-muted);">时限：{{ activity.config.timeLimitMinutes }} 分钟</p>

          <label class="field">你的答案
            <textarea data-training-answer v-model="trainingAnswer" rows="4" placeholder="输入你的答案"></textarea>
          </label>

          <p v-if="trainingError" class="empty-state" style="margin-top:8px;" role="alert">{{ trainingError }}</p>

          <div v-if="trainingFeedback" data-training-feedback class="form-panel" style="background:var(--practicum-teal-soft);">
            <strong>反馈</strong>
            <p>{{ trainingFeedback }}</p>
          </div>
          <div v-for="(attempt, index) in trainingAttempts" :key="attempt.submittedAt" data-training-attempt class="plan-row">
            <div><strong>第 {{ index + 1 }} 次</strong><span>{{ attempt.feedback }}</span></div>
          </div>

          <div class="form-actions">
            <button data-training-submit class="primary-button" type="button" :disabled="trainingAttempts.length >= (activity.config.maxAttempts || 99)" @click="submitTrainingAnswer">提交答案</button>
            <span data-attempt-count class="status-pill">已提交 {{ trainingAttempts.length }} 次 · 最多 {{ activity.config.maxAttempts }} 次</span>
          </div>
        </section>

        <!-- PRACTICE_ACTIVITY -->
        <section v-if="activity.config.type === 'PRACTICE_ACTIVITY'" data-practice-activity class="form-panel">
          <h2>交付物</h2>
          <ul v-if="activity.config.deliverables.length">
            <li v-for="d in activity.config.deliverables" :key="d">{{ d }}</li>
          </ul>
          <p v-else class="empty-state">无交付物要求</p>

          <h2>评分维度</h2>
          <ul v-if="activity.config.rubric.length">
            <li v-for="r in activity.config.rubric" :key="r.id">{{ r.label }}（{{ r.maxScore }}分）<span v-if="r.required" class="status-pill status-pill-orange" style="font-size:11px;">必评</span></li>
          </ul>

          <h2>你的成果</h2>
          <label class="field">草稿内容
            <textarea data-practice-draft v-model="practiceDraft" rows="6" placeholder="输入你的实践成果"></textarea>
          </label>

          <p v-if="draftSaved" data-draft-saved class="status-pill">草稿已保存</p>
          <p v-if="submissionError" data-submission-error class="empty-state" role="alert">{{ submissionError }}</p>

          <div class="form-actions">
            <button data-save-draft class="secondary-button" type="button" @click="saveDraft">保存草稿</button>
            <button data-submit-practice class="primary-button" type="button" :disabled="submissionPending" @click="showSubmitConfirm = true">提交成果</button>
          </div>

          <!-- Submit confirmation -->
          <div v-if="showSubmitConfirm" class="form-panel" style="margin-top:12px;">
            <p>提交后将创建一个编号的不可变版本，状态将变为"已提交"。</p>
            <div class="form-actions">
              <button data-confirm-submit class="primary-button" type="button" :disabled="submissionPending" @click="submitPractice">{{ submissionPending ? '提交中...' : '确认提交' }}</button>
              <button class="secondary-button" type="button" @click="showSubmitConfirm = false">取消</button>
            </div>
          </div>

          <!-- Submission versions -->
          <p v-if="submissionStatus !== 'NOT_STARTED'" data-submission-status class="status-pill" :class="submissionStatus === 'RETURNED' ? 'status-pill-orange' : ''">{{ submissionStatusLabel }}</p>
          <p v-if="serverTaskError" data-task-error class="empty-state" role="alert">{{ serverTaskError }}</p>
          <div v-if="submissionGrade" data-submission-grade class="form-panel" style="margin-top:16px;background:var(--practicum-teal-soft);">
            <strong>评分：{{ submissionGrade.score }}</strong>
            <p data-submission-grade-feedback>{{ submissionGrade.feedback }}</p>
          </div>
          <p v-if="returnedFeedback" data-returned-feedback class="empty-state">退回反馈：{{ returnedFeedback }}</p>
          <div v-if="submissionVersions.length" style="margin-top:16px;">
            <h2>提交记录</h2>
            <div v-for="v in submissionVersions" :key="v.id" data-submission-version class="plan-row">
              <div>
                <strong>版本 {{ v.version }}</strong>
                <span>{{ v.text }} · {{ v.submittedAt }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ActivityType } from '~/domain/practicum/types'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { canSubmitWork } from '~/domain/practicum/permissions'
import { usePracticumServer } from '~/composables/usePracticumServer'
import { useAuthSession } from '~/composables/useAuthSession'

const route = useRoute()
const store = usePracticumStore()
const server = usePracticumServer()
const auth = useAuthSession()
const isLoading = ref(true)
const serverPlanDetail = ref<Awaited<ReturnType<typeof server.getPlan>> | null>(null)
const serverTaskDetail = ref<Awaited<ReturnType<typeof server.getStudentTask>> | null>(null)
const serverTaskId = ref<string | null>(null)
const serverTaskStatus = ref<string | null>(null)
type ServerTaskSubmission = {
  id: string
  currentVersion: number
  submittedAt: string | null
  versions: Array<{ id: string; version: number; text: string; submittedAt: string }>
  grade?: { score: number | string; feedback: string } | null
}
const serverTaskSubmission = ref<ServerTaskSubmission | null>(null)
const serverTaskLoaded = ref(false)
const serverTaskError = ref('')
const loadError = ref('')
const isForbidden = ref(false)
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
onMounted(async () => {
  resetServerState()
  const user = await waitForAuthUser()
  if (user) store.switchRole(user.role)
  if (user?.role !== 'STUDENT') {
    isLoading.value = false
    return
  }
  try {
    const requestedTaskId = typeof route.query.taskId === 'string' ? route.query.taskId : null
    const taskId = requestedTaskId ?? (await server.listStudentTasks()).items.find(task => task.activityId === nodeId.value)?.id
    if (!taskId) {
      loadError.value = '当前活动尚未分配给你，无法读取学习内容。'
      return
    }
    const detail = await server.getStudentTask(taskId)
    if (detail.task.activityId !== nodeId.value) {
      isForbidden.value = true
      return
    }
    serverTaskId.value = detail.task.id
    serverTaskDetail.value = detail
    serverTaskStatus.value = detail.task.status
    serverTaskSubmission.value = detail.submission as ServerTaskSubmission | null
    serverPlanDetail.value = await server.getPlan(detail.task.planId)
    if (!activityNode.value || !activity.value) {
      loadError.value = '服务端未返回当前活动内容，请联系教师检查任务配置。'
      return
    }
    if (activity.value.config.type !== 'PRACTICE_ACTIVITY') {
      serverLearningState.value = (await server.getStudentTaskLearningState(detail.task.id)).learningState
    }
    serverTaskLoaded.value = true
    void recordHeartbeat('HEARTBEAT')
    heartbeatTimer = setInterval(() => void recordHeartbeat('HEARTBEAT'), 60_000)
    document.addEventListener('visibilitychange', onVisibilityChange)
  } catch (error) {
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error ? Number(error.statusCode) : 0
    if (statusCode === 403 || statusCode === 404) isForbidden.value = true
    else loadError.value = '活动状态暂时无法读取，请刷新后重试。'
  } finally {
    isLoading.value = false
  }
})

onBeforeUnmount(() => {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

function onVisibilityChange() {
  void recordHeartbeat(document.visibilityState === 'visible' ? 'VISIBILITY_VISIBLE' : 'VISIBILITY_HIDDEN')
}

async function recordHeartbeat(eventType: 'HEARTBEAT' | 'VISIBILITY_VISIBLE' | 'VISIBILITY_HIDDEN') {
  if (!serverTaskId.value) return
  try { await server.recordTaskHeartbeat(serverTaskId.value, eventType) } catch { /* Learning telemetry must not block the activity. */ }
}

async function waitForAuthUser() {
  if (!auth.state.value.loaded) {
    if (!auth.state.value.loading) {
      await auth.load()
    }
    if (!auth.state.value.loaded) {
      await new Promise<void>((resolve) => {
        const stop = watch(() => auth.state.value.loaded, loaded => {
          if (loaded) {
            stop()
            resolve()
          }
        }, { immediate: true })
      })
    }
  }
  return auth.state.value.user
}
const nodeId = computed(() => route.params.activityId as string)
const activityNode = computed(() => serverPlanDetail.value?.nodes.find(node => node.id === nodeId.value) ?? null)
const activity = computed(() => {
  const node = activityNode.value
  if (!node?.activityId) return null
  return serverPlanDetail.value?.activities.find(item => item.id === node.activityId) ?? null
})
const activityPlan = computed(() => serverPlanDetail.value?.plan ?? null)
const viewerRole = computed(() => auth.state.value.user?.role ?? store.state.activeRole)
const isPublishedStudentActivity = computed(() => viewerRole.value === 'STUDENT' && activityPlan.value?.status === 'PUBLISHED')
const isLocked = computed(() => serverTaskDetail.value?.task.status === 'LOCKED')
const isUnavailable = computed(() => ['NOT_YET_AVAILABLE', 'CLOSED'].includes(serverTaskDetail.value?.task.availability ?? ''))
const unavailableMessage = computed(() => serverTaskDetail.value?.task.availability === 'NOT_YET_AVAILABLE'
  ? '该任务尚未到开放时间，请在开放后再开始。'
  : '该任务已超过提交截止时间，当前不能继续操作。')

type ServerLearningState = Awaited<ReturnType<typeof server.getStudentTaskLearningState>>['learningState']
const serverLearningState = ref<ServerLearningState | null>(null)
const completedSteps = computed(() => new Set(serverLearningState.value?.type === 'SOFTWARE_ACTION' ? serverLearningState.value.completedStepIds : []))
const incompleteError = ref('')
const completionStatus = computed(() => serverLearningState.value?.type === 'SOFTWARE_ACTION' && serverLearningState.value.completedAt ? 'completed' : 'incomplete')
const showResetConfirm = ref(false)

async function toggleStep(stepId: string) {
  const next = new Set(completedSteps.value)
  if (next.has(stepId)) next.delete(stepId)
  else next.add(stepId)
  try {
    if (!serverTaskId.value) throw new Error('student task unavailable')
    serverLearningState.value = (await server.saveStudentTaskLearningState(serverTaskId.value, { type: 'SOFTWARE_ACTION', completedStepIds: [...next] })).learningState
    incompleteError.value = ''
  } catch {
    incompleteError.value = '步骤保存失败，请检查网络后重试。'
  }
}

const firstCheckbox = ref<HTMLElement | null>(null)

async function attemptComplete() {
  if (!activity.value || activity.value.config.type !== 'SOFTWARE_ACTION') return
  const missing = activity.value.config.steps.filter(step => step.required && !completedSteps.value.has(step.id)).map(step => step.label)
  if (missing.length) {
    incompleteError.value = `请先完成必做步骤：${missing.join('、')}`
    // Focus the first checkbox if the error message is shown
    setTimeout(() => {
      const cb = document.querySelector('[data-step-checkbox]') as HTMLElement | null
      cb?.focus()
    }, 50)
    return
  }
  try {
    if (!serverTaskId.value) throw new Error('student task unavailable')
    serverLearningState.value = (await server.saveStudentTaskLearningState(serverTaskId.value, { type: 'SOFTWARE_ACTION', completedStepIds: [...completedSteps.value], complete: true })).learningState
    incompleteError.value = ''
  } catch {
    incompleteError.value = '完成状态保存失败，请检查网络后重试。'
  }
}

async function handleReset() {
  try {
    if (!serverTaskId.value) throw new Error('student task unavailable')
    serverLearningState.value = (await server.saveStudentTaskLearningState(serverTaskId.value, { type: 'SOFTWARE_ACTION', completedStepIds: [] })).learningState
    showResetConfirm.value = false
    incompleteError.value = ''
  } catch {
    incompleteError.value = '重置失败，请检查网络后重试。'
  }
}

// Training state
const trainingAnswer = ref('')
const trainingError = ref('')
const trainingAttempts = computed(() => serverLearningState.value?.type === 'TRAINING' ? serverLearningState.value.attempts : [])
const trainingFeedback = computed(() => trainingAttempts.value.at(-1)?.feedback ?? '')

async function submitTrainingAnswer() {
  if (!activity.value || activity.value.config.type !== 'TRAINING') return
  if (!trainingAnswer.value.trim()) {
    trainingError.value = '请输入答案后再提交。'
    return
  }
  try {
    if (!serverTaskId.value) throw new Error('student task unavailable')
    serverLearningState.value = (await server.saveStudentTaskLearningState(serverTaskId.value, { type: 'TRAINING', answer: trainingAnswer.value })).learningState
    trainingError.value = ''
    trainingAnswer.value = ''
  } catch {
    trainingError.value = '训练答案提交失败，请检查网络后重试。'
  }
}

// Practice state
const practiceDraft = ref('')
const savedPracticeDraft = ref('')
const draftSaved = ref(false)
const showSubmitConfirm = ref(false)
const showUnsavedLeave = ref(false)
const submissionVersions = computed(() => serverTaskLoaded.value ? (serverTaskSubmission.value?.versions ?? []) : [])
const submissionStatus = computed(() => serverTaskLoaded.value ? (serverTaskStatus.value ?? 'NOT_STARTED') : 'NOT_STARTED')
const returnedFeedback = computed(() => submissionStatus.value === 'RETURNED' ? (serverTaskDetail.value?.returnedFeedback?.feedback ?? '') : '')
const submissionGrade = computed(() => serverTaskSubmission.value?.grade ?? null)
const submissionStatusLabel = computed(() => submissionStatus.value === 'RETURNED' ? '已退回' : submissionStatus.value === 'GRADED' ? '已评分' : '已提交')
const submissionPending = ref(false)
const submissionError = ref('')

function saveDraft() {
  savedPracticeDraft.value = practiceDraft.value
  draftSaved.value = true
  setTimeout(() => { draftSaved.value = false }, 3000)
}

async function submitPractice() {
  if (!practiceDraft.value.trim()) return
  if (submissionPending.value) return
  submissionPending.value = true
  submissionError.value = ''
  try {
    if (auth.state.value.user?.role !== 'STUDENT') throw new Error('student session required')
    if (!serverTaskId.value) throw new Error('student task unavailable')
    const result = await server.submitStudentTask(serverTaskId.value, practiceDraft.value)
    serverTaskStatus.value = result.task.status
    serverTaskSubmission.value = result.submission
    if (serverTaskDetail.value) {
      serverTaskDetail.value = { ...serverTaskDetail.value, task: { ...serverTaskDetail.value.task, status: result.task.status }, submission: result.submission, returnedFeedback: null }
    }
    savedPracticeDraft.value = practiceDraft.value
    showSubmitConfirm.value = false
    draftSaved.value = false
  } catch {
    submissionError.value = '提交失败，请检查网络后重试。'
  } finally {
    submissionPending.value = false
  }
}

function leaveActivity() {
  if (activityPlan.value) navigateTo(`/practicum/learn/${activityPlan.value.id}`)
}

function requestBack() {
  if (activity.value?.config.type === 'PRACTICE_ACTIVITY' && practiceDraft.value !== savedPracticeDraft.value) {
    showUnsavedLeave.value = true
    return
  }
  leaveActivity()
}

function saveAndLeave() {
  savedPracticeDraft.value = practiceDraft.value
  leaveActivity()
}

function discardAndLeave() {
  practiceDraft.value = savedPracticeDraft.value
  leaveActivity()
}

function resetServerState() {
  serverPlanDetail.value = null
  serverTaskDetail.value = null
  serverTaskId.value = null
  serverTaskStatus.value = null
  serverTaskSubmission.value = null
  serverLearningState.value = null
  serverTaskLoaded.value = false
  serverTaskError.value = ''
  loadError.value = ''
  isForbidden.value = false
}

function activityTypeLabel(type?: ActivityType) {
  if (type === 'SOFTWARE_ACTION') return '软件操作'
  if (type === 'TRAINING') return '训练活动'
  return '实践活动'
}
</script>
