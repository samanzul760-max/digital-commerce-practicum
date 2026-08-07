<template>
  <ClientOnly>
    <PracticumShell context-title="教师课堂" context-meta="在授权班级内发布公告、管理课堂并查看当前活动执行情况">
      <PracticumStatePanel
        v-if="loading"
        data-teaching-loading
        state="loading"
        title="正在加载教师课堂"
        description="正在从服务端读取班级公告、课堂和执行统计。"
      />
      <PracticumStatePanel
        v-else-if="forbidden"
        data-forbidden
        state="forbidden"
        title="无法访问该班级课堂"
        description="该班级不在当前教师的服务端授权范围内。"
      />
      <PracticumStatePanel
        v-else-if="errorMessage"
        data-teaching-error
        state="error"
        title="教师课堂暂时无法加载"
        :description="errorMessage"
        @retry="load"
      />
      <main v-else class="teaching-workbench" data-teaching-workbench>
        <header class="page-heading teaching-heading">
          <div>
            <p class="eyebrow">班级教学</p>
            <h1>教师课堂</h1>
            <p>公告、课堂节次与活动执行数据均来自当前班级的服务端记录。</p>
          </div>
          <NuxtLink class="secondary-button" to="/practicum/classes">返回班级列表</NuxtLink>
        </header>

        <section class="metric-strip" aria-label="当前课堂统计">
          <article><span>班级公告</span><strong>{{ announcements.length }}</strong></article>
          <article><span>当前课堂</span><strong>{{ currentSession ? '进行中' : '未开始' }}</strong></article>
          <article><span>活动参与</span><strong>{{ execution.total }}</strong></article>
          <article><span>已完成</span><strong>{{ execution.completed }}</strong></article>
        </section>

        <div class="teaching-grid">
          <section class="teaching-panel" aria-labelledby="announcement-heading">
            <div class="panel-heading">
              <div><h2 id="announcement-heading">班级公告</h2><p>先保存草稿，再发布或关闭。</p></div>
            </div>
            <form class="compact-form" @submit.prevent="createAnnouncement">
              <label>公告标题<input v-model.trim="announcementTitle" maxlength="120" required></label>
              <label>公告内容<textarea v-model.trim="announcementBody" maxlength="4000" rows="3" required /></label>
              <button class="primary-button" type="submit" :disabled="busy || !announcementTitle || !announcementBody">
                {{ busy === 'announcement' ? '保存中...' : '保存草稿' }}
              </button>
            </form>
            <PracticumStatePanel v-if="!announcements.length" data-announcement-empty state="empty" title="暂无班级公告" description="保存草稿后，可在这里发布课堂通知。" />
            <div v-else class="record-list">
              <article v-for="announcement in announcements" :key="announcement.id" class="record-row" data-announcement-row>
                <div class="record-content"><strong>{{ announcement.title }}</strong><p>{{ announcement.body }}</p><small>{{ announcementStatus(announcement.status) }}</small></div>
                <div class="row-actions">
                  <button v-if="announcement.status === 'DRAFT'" class="icon-action" type="button" title="发布公告" :disabled="busy" @click="transitionAnnouncement(announcement.id, 'PUBLISH')">发布</button>
                  <button v-if="announcement.status === 'PUBLISHED'" class="icon-action danger-action" type="button" title="关闭公告" :disabled="busy" @click="transitionAnnouncement(announcement.id, 'CLOSE')">关闭</button>
                </div>
              </article>
            </div>
          </section>

          <section class="teaching-panel" aria-labelledby="session-heading">
            <div class="panel-heading">
              <div><h2 id="session-heading">课堂节次</h2><p>一次课堂对应一个当前活动，结束后保留历史记录。</p></div>
            </div>
            <form v-if="!currentSession" class="compact-form" @submit.prevent="startSession">
              <label>当前活动 ID<input v-model.trim="activityId" required placeholder="输入本次课堂活动 ID"></label>
              <button class="primary-button" type="submit" :disabled="busy || !activityId">{{ busy === 'session' ? '开始中...' : '开始课堂' }}</button>
            </form>
            <div v-else class="current-session" data-current-session>
              <div><span class="status-dot" /> <strong>课堂进行中</strong><p>当前活动：{{ currentSession.currentActivityId || '未指定活动' }}</p></div>
              <button class="secondary-button" type="button" :disabled="busy" @click="endSession">{{ busy === 'session' ? '结束中...' : '结束课堂' }}</button>
            </div>
            <PracticumStatePanel v-if="!sessions.length" data-session-empty state="empty" title="暂无课堂记录" description="开始课堂后，当前活动的执行统计会显示在右侧。" />
            <div v-else class="record-list session-list">
              <article v-for="session in sessions" :key="session.id" class="record-row">
                <div class="record-content"><strong>{{ session.status === 'ACTIVE' ? '进行中课堂' : '已结束课堂' }}</strong><p>{{ session.currentActivityId || '未指定活动' }}</p><small>{{ formatTime(session.startedAt) }}</small></div>
              </article>
            </div>
          </section>
        </div>

        <section class="execution-section" data-execution-summary>
          <div class="panel-heading">
            <div><h2>当前活动执行</h2><p>仅汇总本课堂的活动执行记录；评分事实在既有审核页面查看。</p></div>
            <NuxtLink class="secondary-button" :to="reviewHref">进入评分审核</NuxtLink>
          </div>
          <PracticumStatePanel v-if="!currentSession" state="empty" title="尚未开始课堂" description="开始课堂后可查看当前活动的参与和完成情况。" />
          <div v-else class="execution-metrics">
            <article><span>未开始</span><strong>{{ execution.notStarted }}</strong></article>
            <article><span>进行中</span><strong>{{ execution.inProgress }}</strong></article>
            <article><span>已完成</span><strong>{{ execution.completed }}</strong></article>
          </div>
        </section>
      </main>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

interface Announcement {
  id: string
  title: string
  body: string
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
}

interface TeachingSession {
  id: string
  currentActivityId: string | null
  status: 'ACTIVE' | 'ENDED'
  startedAt: string
}

interface ExecutionSummary {
  total: number
  notStarted: number
  inProgress: number
  completed: number
}

const route = useRoute()
const auth = useAuthSession()
const csrfToken = useCookie<string | null>('practicum_csrf')
const classId = computed(() => String(route.params.classId ?? ''))
const canTeach = computed(() => ['OWNER', 'TEACHER'].includes(auth.state.value.user?.role ?? ''))
const announcements = ref<Announcement[]>([])
const sessions = ref<TeachingSession[]>([])
const execution = ref<ExecutionSummary>({ total: 0, notStarted: 0, inProgress: 0, completed: 0 })
const reviewHref = ref('/practicum/reviews')
const loading = ref(true)
const forbidden = ref(false)
const errorMessage = ref('')
const busy = ref<'announcement' | 'session' | ''>('')
const announcementTitle = ref('')
const announcementBody = ref('')
const activityId = ref('')
const currentSession = computed(() => sessions.value.find(session => session.status === 'ACTIVE') ?? null)

onMounted(async () => {
  await auth.load()
  await load()
})

watch(classId, () => void load())

function requestKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function writeHeaders(key: string) {
  return { 'x-csrf-token': csrfToken.value ?? '', 'Idempotency-Key': key }
}

function errorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('data' in error)) return ''
  const data = (error as { data?: { data?: { code?: string } } }).data
  return data?.data?.code ?? ''
}

async function load() {
  loading.value = true
  forbidden.value = false
  errorMessage.value = ''
  if (!canTeach.value || !classId.value) {
    forbidden.value = true
    loading.value = false
    return
  }
  try {
    const [announcementResult, sessionResult] = await Promise.all([
      $fetch<{ items: Announcement[] }>(`/api/practicum/teacher/classes/${classId.value}/announcements`),
      $fetch<{ items: TeachingSession[] }>(`/api/practicum/teacher/classes/${classId.value}/sessions`),
    ])
    announcements.value = announcementResult.items
    sessions.value = sessionResult.items
    await loadExecution()
  } catch (error) {
    if (['CLASS_NOT_FOUND', 'AUTH_REQUIRED'].includes(errorCode(error))) forbidden.value = true
    else errorMessage.value = '服务端数据未能返回，请稍后重试。'
  } finally {
    loading.value = false
  }
}

async function loadExecution() {
  if (!currentSession.value) {
    execution.value = { total: 0, notStarted: 0, inProgress: 0, completed: 0 }
    reviewHref.value = `/practicum/reviews?classId=${encodeURIComponent(classId.value)}`
    return
  }
  const result = await $fetch<{ execution: ExecutionSummary; reviewHref: string }>(`/api/practicum/teacher/sessions/${currentSession.value.id}/execution`)
  execution.value = result.execution
  reviewHref.value = result.reviewHref
}

async function createAnnouncement() {
  if (busy.value || !announcementTitle.value || !announcementBody.value) return
  busy.value = 'announcement'
  try {
    await $fetch(`/api/practicum/teacher/classes/${classId.value}/announcements`, {
      method: 'POST', headers: writeHeaders(requestKey('announcement')),
      body: { title: announcementTitle.value, content: announcementBody.value },
    })
    announcementTitle.value = ''
    announcementBody.value = ''
    await load()
  } catch (error) {
    errorMessage.value = errorCode(error) === 'CSRF_INVALID' ? '会话校验已失效，请刷新后重试。' : '公告保存失败，请稍后重试。'
  } finally {
    busy.value = ''
  }
}

async function transitionAnnouncement(announcementId: string, action: 'PUBLISH' | 'CLOSE') {
  if (busy.value) return
  busy.value = 'announcement'
  try {
    await $fetch(`/api/practicum/teacher/classes/${classId.value}/announcements`, {
      method: 'POST', headers: writeHeaders(requestKey(`announcement-${action.toLowerCase()}`)),
      body: { announcementId, action },
    })
    await load()
  } catch (error) {
    errorMessage.value = errorCode(error) === 'TEACHING_STATE_INVALID' ? '公告状态已经变化，请刷新后再操作。' : '公告状态更新失败。'
  } finally {
    busy.value = ''
  }
}

async function startSession() {
  if (busy.value || !activityId.value) return
  busy.value = 'session'
  try {
    await $fetch(`/api/practicum/teacher/classes/${classId.value}/sessions`, {
      method: 'POST', headers: writeHeaders(requestKey('session-start')),
      body: { action: 'START', activityId: activityId.value },
    })
    activityId.value = ''
    await load()
  } catch (error) {
    errorMessage.value = errorCode(error) === 'TEACHING_SESSION_ACTIVE' ? '当前班级已有进行中的课堂。' : '课堂未能开始，请稍后重试。'
  } finally {
    busy.value = ''
  }
}

async function endSession() {
  if (busy.value || !currentSession.value) return
  busy.value = 'session'
  try {
    await $fetch(`/api/practicum/teacher/classes/${classId.value}/sessions`, {
      method: 'POST', headers: writeHeaders(requestKey('session-end')),
      body: { action: 'END', sessionId: currentSession.value.id },
    })
    await load()
  } catch {
    errorMessage.value = '课堂未能结束，请稍后重试。'
  } finally {
    busy.value = ''
  }
}

function announcementStatus(status: Announcement['status']) {
  return ({ DRAFT: '草稿', PUBLISHED: '已发布', CLOSED: '已关闭' })[status]
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.teaching-workbench { max-width: 1120px; margin: 0 auto; padding: 24px; }.teaching-heading { margin-bottom: 20px; }.metric-strip, .execution-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }.metric-strip article, .execution-metrics article { border: 1px solid var(--practicum-border, #e5e7eb); background: #fff; border-radius: 6px; padding: 12px; display: grid; gap: 4px; }.metric-strip span, .execution-metrics span, .record-content small, .panel-heading p { color: var(--practicum-muted, #667085); font-size: 13px; }.metric-strip strong, .execution-metrics strong { color: #111827; font-size: 20px; }.teaching-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }.teaching-panel, .execution-section { border: 1px solid var(--practicum-border, #e5e7eb); background: #fff; border-radius: 6px; padding: 16px; }.panel-heading { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }.panel-heading h2 { margin: 0; font-size: 18px; }.panel-heading p { margin: 4px 0 0; }.compact-form { display: grid; gap: 12px; }.compact-form label { display: grid; gap: 6px; color: #344054; font-size: 14px; }.compact-form input, .compact-form textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--practicum-border, #e5e7eb); border-radius: 4px; padding: 8px 10px; font: inherit; color: #111827; resize: vertical; }.compact-form .primary-button { justify-self: start; }.record-list { margin-top: 16px; border-top: 1px solid var(--practicum-border, #e5e7eb); }.record-row { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--practicum-border, #e5e7eb); }.record-content { min-width: 0; }.record-content p { margin: 4px 0; color: #475467; overflow-wrap: anywhere; }.row-actions { display: flex; align-items: flex-start; }.icon-action { border: 0; background: transparent; color: #2563eb; padding: 4px; cursor: pointer; font: inherit; }.danger-action { color: #b42318; }.icon-action:disabled { cursor: not-allowed; opacity: .55; }.current-session { display: flex; justify-content: space-between; gap: 12px; align-items: center; background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 6px; }.current-session p { margin: 4px 0 0; color: #475467; overflow-wrap: anywhere; }.status-dot { display: inline-block; width: 8px; height: 8px; margin-right: 5px; border-radius: 50%; background: #16a34a; }.session-list { max-height: 224px; overflow-y: auto; }.execution-section { margin-top: 16px; }.execution-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }.state-panel { max-width: 1120px; margin: 24px auto; } @media (max-width: 720px) { .teaching-workbench { padding: 16px; }.metric-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }.teaching-grid { grid-template-columns: 1fr; }.panel-heading, .current-session, .record-row { flex-direction: column; }.panel-heading .secondary-button, .current-session .secondary-button { align-self: flex-start; }.execution-metrics { grid-template-columns: 1fr; } }
</style>
