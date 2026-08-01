<template>
  <ClientOnly>
    <PracticumShell context-title="学员中心" :context-meta="contextMeta">
      <PracticumStatePanel
        v-if="!canViewProgress(store.state.activeRole)"
        data-forbidden
        state="forbidden"
        title="无法访问学员中心"
        description="请切换到学生或管理员身份后重试。"
      />

      <section v-else class="dashboard" data-student-growth>
        <PracticumStatePanel v-if="progressLoading" state="loading" title="正在同步学习进度" description="正在从服务端读取最新任务状态。" data-progress-loading />
        <PracticumStatePanel v-else-if="progressError" state="error" title="进度暂时无法加载" description="请检查网络后重试，页面不会使用本地数据覆盖服务端结果。" data-progress-error @retry="loadProgress" />
        <aside class="side">
          <NuxtLink to="/practicum/progress" class="active"><PracticumIcon name="dashboard" /><span>概况</span></NuxtLink>
          <NuxtLink to="/practicum/courses"><PracticumIcon name="book" /><span>我的课程</span></NuxtLink>
          <NuxtLink to="/practicum/achievements"><PracticumIcon name="trophy" /><span>成就</span></NuxtLink>
          <NuxtLink to="/practicum/tasks"><PracticumIcon name="clipboard-check" /><span>任务</span></NuxtLink>
        </aside>

        <main class="dash-main">
          <section class="dash-welcome">
            <div class="live-heading">
              <div>
                <p class="live-label">实时学习运营</p>
                <h2>{{ store.state.activeRole === 'OWNER' ? '教学进度总览' : '本周学习进度' }}</h2>
                <p>{{ store.state.activeRole === 'OWNER' ? `当前有 ${pendingReviewCount} 份作业等待批阅。` : `距离本周学习目标还差 ${todoCount} 个任务，继续保持。` }}</p>
              </div>
              <div class="live-metrics" aria-label="服务端实时数据">
                <div><span>完成率</span><strong data-overall-progress>{{ serverProgress?.totals.percent ?? 0 }}%</strong></div>
                <div><span>已分配任务</span><strong>{{ serverProgress?.totals.total ?? 0 }}</strong></div>
                <div><span>已完成</span><strong>{{ serverProgress?.totals.completed ?? 0 }}</strong></div>
              </div>
            </div>
            <p v-if="backendStats" data-backend-stats class="sync-line">服务端同步：{{ backendStats.publishedPlanCount }} 门已发布课程 · {{ backendStats.activityCount }} 个实操活动</p>
            <div class="overview-actions" aria-label="快捷操作">
              <NuxtLink to="/practicum/tasks" class="overview-action-primary">继续上次实操</NuxtLink>
              <NuxtLink to="/practicum/achievements" class="overview-action">查看我的勋章</NuxtLink>
              <NuxtLink to="/practicum/tasks" class="overview-action">提交作业</NuxtLink>
            </div>
          </section>

          <div class="dash-grid">
            <div>
              <section class="paper">
                <h3>{{ store.state.activeRole === 'OWNER' ? '班级课程进度' : '主修的课程' }}</h3>
                <div v-if="displayProgressPlans.length">
                  <NuxtLink
                    v-for="(plan, index) in displayProgressPlans.slice(0, 4)"
                    :key="plan.id"
                    :to="plan.source === 'server' ? '/practicum/tasks' : (store.state.activeRole === 'OWNER' ? `/practicum/courses/${plan.id}` : `/practicum/learn/${plan.id}`)"
                    class="progress-row"
                  >
                    <div class="thumb" :style="{ background: colors[index % colors.length] }" />
                    <div>
                      {{ plan.title }}：{{ plan.percent }}% 完成
                      <div class="track"><i :style="{ width: plan.percent + '%' }" /></div>
                    </div>
                    <b>{{ plan.percent }}%</b>
                  </NuxtLink>
                </div>
                <PracticumStatePanel v-else-if="!progressLoading && !progressError" state="empty" title="尚未分配可统计任务" description="已发布课程不会自动产生班级进度。请先将计划分配给班级，页面才会显示真实的服务端完成率。" />
              </section>

              <section class="paper" style="margin-top:15px">
                <h3>继续学习</h3>
                <div class="cards progress-entry-cards">
                  <PracticumCourseCard
                    v-for="plan in plans.slice(0, 2)"
                    :key="plan.id"
                    :plan="plan"
                    :module-count="moduleCount(plan.id)"
                    :activity-count="activityCount(plan.id)"
                    :can-learn="store.state.activeRole === 'STUDENT' && plan.status === 'PUBLISHED'"
                    :can-manage="store.state.activeRole === 'OWNER'"
                  />
                  <NuxtLink
                    v-for="entry in progressEntries"
                    :key="entry.to"
                    :to="entry.to"
                    class="progress-entry-card"
                    data-progress-entry-card
                  >
                    <span>{{ entry.tag }}</span>
                    <strong>{{ entry.title }}</strong>
                    <p>{{ entry.description }}</p>
                  </NuxtLink>
                </div>
                <PracticumStatePanel
                  v-if="!plans.length && !progressEntries.length"
                  state="empty"
                  title="暂无学习记录"
                  description="去课程大厅选择课程开始学习吧。"
                />
              </section>
            </div>

            <section class="paper">
              <h3>学习日历</h3>
              <div class="calendar" aria-label="学习日历">
                <b v-for="day in calendarDays" :key="day" :style="markedDays.includes(day) ? 'background:#e6f4ff;color:#147bd1' : ''">{{ day < 4 ? '' : day - 3 }}</b>
              </div>
              <div class="calendar-info">
                <h3 style="margin-top:20px">下一次提醒</h3>
                <p class="calendar-detail">
                  周五 19:30<br>
                  <b style="color:#17222e">{{ nextReminder }}</b>
                </p>
                <h3 style="margin-top:16px">最近任务</h3>
                <div v-if="recentTaskItems.length" class="calendar-list">
                  <NuxtLink
                    v-for="item in recentTaskItems"
                    :key="item.to"
                    :to="item.to"
                    class="calendar-list-item"
                  >{{ item.label }}</NuxtLink>
                </div>
                <p v-else class="calendar-detail">暂无待办任务</p>
                <h3 style="margin-top:16px">最近通知</h3>
                <div v-if="recentCalendarNotifications.length" class="calendar-list">
                  <NuxtLink
                    v-for="item in recentCalendarNotifications"
                    :key="item.id"
                    :to="item.targetRoute"
                    class="calendar-list-item"
                  >{{ item.title }}</NuxtLink>
                </div>
                <p v-else class="calendar-detail">暂无新通知</p>
              </div>
            </section>
          </div>
        </main>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { usePracticumServer } from '~/composables/usePracticumServer'
import { canViewProgress } from '~/domain/practicum/permissions'

const store = usePracticumStore()
const server = usePracticumServer()
const backendStats = ref<Record<string, number> | null>(null)
const serverProgress = ref<{ plans: Array<{ id: string; title: string; percent: number; total: number; completed: number }>; totals: { total: number; completed: number; percent: number } } | null>(null)
const progressLoading = ref(false)
const progressError = ref(false)
const plans = computed(() => store.visiblePlansFor(store.state.activeRole))
const displayProgressPlans = computed(() => serverProgress.value
  ? serverProgress.value.plans.map(plan => ({ ...plan, source: 'server' as const }))
  : [])
const pendingReviewCount = computed(() => store.getReviewQueue().filter(item => item.status === 'SUBMITTED').length)
const todoCount = computed(() => {
  const plan = plans.value[0]
  if (!plan) return 0
  const progress = store.getPlanProgress(plan.id)
  return Math.max(progress.total - progress.completed, 0)
})
const contextMeta = computed(() => store.state.room.title)
const colors = ['#ff9d45', '#8b75e4', '#49ac86', '#4d8be5']
const calendarDays = Array.from({ length: 35 }, (_, index) => index)
const markedDays = [7, 14, 20, 27]
const nextReminder = computed(() => store.state.activeRole === 'OWNER' ? '批阅中心：处理最新学生提交' : '直播复盘：商品详情页优化')

const recentTaskItems = computed(() => {
  const items: { label: string; to: string }[] = []
  if (todoCount.value > 0) {
    items.push({ label: `还有 ${todoCount.value} 个任务待完成`, to: '/practicum/tasks' })
  }
  const reviewItems = store.getReviewQueue().filter(item => item.status === 'RETURNED')
  if (reviewItems.length > 0) {
    items.push({ label: `${reviewItems.length} 份作业已退回待修改`, to: '/practicum/tasks' })
  }
  if (!items.length) {
    items.push({ label: '去课程大厅浏览课程', to: '/practicum/courses' })
  }
  return items.slice(0, 3)
})

const recentCalendarNotifications = computed(() => {
  if (!store.state.activeRole) return []
  return store.notificationsForRole(store.state.activeRole).slice(0, 3)
})

const progressEntries = computed(() => [
  {
    tag: '任务',
    title: '查看待办任务',
    description: '把未完成的实操、退回修改和下一步学习集中处理。',
    to: '/practicum/tasks',
  },
  {
    tag: '课程',
    title: '发现更多课程',
    description: '去课程大厅继续选择适合自己的电商实训项目。',
    to: '/practicum/courses',
  },
  {
    tag: '提醒',
    title: '查看通知反馈',
    description: '查看老师批改、课程提醒和作业反馈。',
    to: '/practicum/notifications',
  },
  {
    tag: '数据',
    title: '查看成长数据',
    description: '查看学习进度、能力维度和数据看板。',
    to: '/practicum/achievements',
  },
])

onMounted(() => {
  void Promise.all([loadBackendStats(), loadProgress()])
})

async function loadProgress() {
  progressLoading.value = true
  progressError.value = false
  try {
    serverProgress.value = await server.getProgress(String(store.state.room.id ?? ''), String(store.state.activeRole ?? 'STUDENT'))
  } catch {
    progressError.value = true
  } finally {
    progressLoading.value = false
  }
}

async function loadBackendStats() {
  try {
    const response = await server.getStats(store.state.room.id)
    backendStats.value = response.stats
  } catch {
    backendStats.value = null
  }
}

function progressFor(planId: string) {
  const remote = serverProgress.value?.plans.find((plan) => plan.id === planId)
  if (remote) return remote
  return store.getPlanProgress(planId)
}
function moduleCount(planId: string) {
  return store.getPlanNodes(planId).filter(node => node.level === 1).length
}
function activityCount(planId: string) {
  return store.getPlanNodes(planId).filter(node => node.level === 3).length
}
</script>
