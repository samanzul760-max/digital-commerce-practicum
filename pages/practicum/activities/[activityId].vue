<template>
  <ClientOnly>
    <PracticumShell :context-title="isPublishedStudentActivity ? activityNode?.title ?? '活动' : '活动不可访问'" :context-meta="isPublishedStudentActivity ? activityTypeLabel(activity?.type) : ''">
      <p v-if="isLoading" data-loading class="empty-state">正在加载活动...</p>

      <p v-else-if="!canSubmitWork(store.state.activeRole) || (activityNode && activity && !isPublishedStudentActivity)" data-forbidden class="empty-state">当前活动不可访问。</p>

      <div v-else-if="!activityNode || !activity || !activityPlan" data-empty class="empty-state">活动未找到。</div>

      <div v-else-if="isLocked" data-locked class="empty-state">请先完成前置活动，再开始此任务。</div>

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
import { computed, onMounted, ref } from 'vue'
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
const serverSubmission = ref<Awaited<ReturnType<typeof server.getSubmission>>['submission'] | null>(null)
onMounted(async () => {
  if (auth.state.value.user?.role !== 'STUDENT') {
    isLoading.value = false
    return
  }
  try {
    serverSubmission.value = (await server.getSubmission(route.params.activityId as string)).submission
  } catch {
    // A first-time activity has no server submission yet.
  } finally {
    isLoading.value = false
  }
})
const nodeId = computed(() => route.params.activityId as string)
const activityNode = computed(() => store.state.nodes.find(n => n.id === nodeId.value) ?? null)
const activity = computed(() => {
  const node = activityNode.value
  if (!node?.activityId) return null
  return store.state.activities.find(a => a.id === node.activityId) ?? null
})
const activityPlan = computed(() => activityNode.value ? store.state.plans.find(plan => plan.id === activityNode.value?.planId) ?? null : null)
const isPublishedStudentActivity = computed(() => store.state.activeRole === 'STUDENT' && activityPlan.value?.status === 'PUBLISHED')
const isLocked = computed(() => store.state.lockedActivityIds.includes(nodeId.value))

const completedSteps = computed(() => new Set(store.getSoftwareAttempt(nodeId.value).completedStepIds))
const incompleteError = ref('')
const completionStatus = computed(() => store.getSoftwareAttempt(nodeId.value).completedAt ? 'completed' : 'incomplete')
const showResetConfirm = ref(false)

function toggleStep(stepId: string) {
  const next = new Set(completedSteps.value)
  if (next.has(stepId)) next.delete(stepId)
  else next.add(stepId)
  store.saveSoftwareSteps(nodeId.value, [...next])
  incompleteError.value = ''
}

const firstCheckbox = ref<HTMLElement | null>(null)

function attemptComplete() {
  const result = store.completeSoftwareActivity(nodeId.value)
  if (!result.success) {
    incompleteError.value = `请先完成必做步骤：${result.missing.join('、')}`
    // Focus the first checkbox if the error message is shown
    setTimeout(() => {
      const cb = document.querySelector('[data-step-checkbox]') as HTMLElement | null
      cb?.focus()
    }, 50)
    return
  }
  incompleteError.value = ''
}

function handleReset() {
  store.resetSoftwareActivity(nodeId.value)
  showResetConfirm.value = false
  incompleteError.value = ''
}

// Training state
const trainingAnswer = ref('')
const trainingError = ref('')
const trainingAttempts = computed(() => store.state.trainingAttempts[nodeId.value] ?? [])
const trainingFeedback = computed(() => trainingAttempts.value.at(-1)?.feedback ?? '')

function submitTrainingAnswer() {
  if (!activity.value || activity.value.config.type !== 'TRAINING') return
  if (!trainingAnswer.value.trim()) {
    trainingError.value = '请输入答案后再提交。'
    return
  }
  trainingError.value = ''
  store.submitTrainingAttempt(nodeId.value, trainingAnswer.value)
  trainingAnswer.value = ''
}

// Practice state
const practiceDraft = ref(store.state.practiceDrafts[nodeId.value] ?? '')
const draftSaved = ref(false)
const showSubmitConfirm = ref(false)
const showUnsavedLeave = ref(false)
const submissionVersions = computed(() => serverSubmission.value?.versions ?? store.state.practiceSubmissions[nodeId.value]?.versions ?? [])
const submissionStatus = computed(() => serverSubmission.value?.status ?? store.state.practiceSubmissions[nodeId.value]?.status ?? 'NOT_STARTED')
const returnedFeedback = computed(() => serverSubmission.value?.feedback ?? store.state.practiceSubmissions[nodeId.value]?.feedback ?? '')
const submissionStatusLabel = computed(() => submissionStatus.value === 'RETURNED' ? '已退回' : submissionStatus.value === 'GRADED' ? '已评分' : '已提交')
const submissionPending = ref(false)
const submissionError = ref('')

function saveDraft() {
  draftSaved.value = store.savePracticeDraft(nodeId.value, practiceDraft.value)
  setTimeout(() => { draftSaved.value = false }, 3000)
}

async function submitPractice() {
  if (!practiceDraft.value.trim()) return
  if (submissionPending.value) return
  submissionPending.value = true
  submissionError.value = ''
  try {
    if (auth.state.value.user?.role === 'STUDENT') {
      const result = await server.submitPractice(nodeId.value, practiceDraft.value)
      serverSubmission.value = result.submission
    }
    store.submitPracticeWork(nodeId.value)
    showSubmitConfirm.value = false
    draftSaved.value = false
  } catch {
    submissionError.value = '提交失败，请检查网络后重试。'
  } finally {
    submissionPending.value = false
  }
}

function leaveActivity() {
  if (activityNode.value) navigateTo(`/practicum/learn/${activityNode.value.planId}`)
}

function requestBack() {
  const saved = store.state.practiceDrafts[nodeId.value] ?? ''
  if (activity.value?.config.type === 'PRACTICE_ACTIVITY' && practiceDraft.value !== saved) {
    showUnsavedLeave.value = true
    return
  }
  leaveActivity()
}

function saveAndLeave() {
  store.savePracticeDraft(nodeId.value, practiceDraft.value)
  leaveActivity()
}

function discardAndLeave() {
  practiceDraft.value = store.state.practiceDrafts[nodeId.value] ?? ''
  leaveActivity()
}

function activityTypeLabel(type?: ActivityType) {
  if (type === 'SOFTWARE_ACTION') return '软件操作'
  if (type === 'TRAINING') return '训练活动'
  return '实践活动'
}
</script>
