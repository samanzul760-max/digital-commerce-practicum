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

      <section v-else class="dash" data-student-growth>
        <div v-if="progressLoading" class="progress-state"><PracticumStatePanel state="loading" title="正在同步学习进度" description="正在从服务端读取最新任务状态。" data-progress-loading /></div>
        <div v-else-if="progressError" class="progress-state"><PracticumStatePanel state="error" title="进度暂时无法加载" description="请检查网络后重试，页面不会使用本地数据覆盖服务端结果。" data-progress-error @retry="loadProgress" /></div>
        <template v-else>
        <aside class="side" data-center-nav>
          <NuxtLink to="/practicum/progress" class="active"><PracticumIcon name="dashboard" /><span>概况</span></NuxtLink>
          <NuxtLink to="/practicum/courses"><PracticumIcon name="book" /><span>我的课程</span></NuxtLink>
          <NuxtLink to="/practicum/shop/products"><PracticumIcon name="layers" /><span>模拟店铺</span></NuxtLink>
          <NuxtLink to="/practicum/tasks"><PracticumIcon name="clipboard-check" /><span>作业</span></NuxtLink>
          <NuxtLink to="/practicum/achievements"><PracticumIcon name="trophy" /><span>成就</span></NuxtLink>
        </aside>

        <main class="dash-main">
          <section class="dash-welcome welcome" data-center-welcome>
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
            <div class="medals" aria-label="学习勋章">
              <span class="medal g" aria-label="完成勋章"><PracticumIcon name="trophy" /></span>
              <span class="medal s" aria-label="成长勋章"><PracticumIcon name="trending-up" /></span>
              <span class="medal b" aria-label="实训勋章"><PracticumIcon name="file-check" /></span>
            </div>
            <div class="overview-actions" aria-label="快捷操作">
              <NuxtLink to="/practicum/tasks" class="overview-action-primary">继续上次实操</NuxtLink>
              <NuxtLink to="/practicum/achievements" class="overview-action">查看我的勋章</NuxtLink>
              <NuxtLink to="/practicum/tasks" class="overview-action">提交作业</NuxtLink>
            </div>
          </section>

          <div class="stat-row" data-center-stat-row>
            <div class="stat"><div class="l">进行中</div><div class="v num">{{ activePlanCount }}</div><small>已发布实训计划</small></div>
            <div class="stat"><div class="l">待完成任务</div><div class="v num">{{ pendingTaskCount }}</div><small>来自服务端任务状态</small></div>
            <div class="stat"><div class="l">完成率</div><div class="v num">{{ serverProgress?.totals.percent ?? 0 }}%</div><small>当前实训室实时进度</small></div>
          </div>

          <div class="dash-grid">
            <div>
              <section class="paper" data-center-progress>
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
                    v-for="entry in serverCourseCards"
                    :key="entry.plan.id"
                    data-center-server-course
                    :plan="entry.plan"
                    :module-count="entry.moduleCount"
                    :activity-count="entry.activityCount"
                    :can-learn="store.state.activeRole === 'STUDENT' && entry.plan.status === 'PUBLISHED'"
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
                  v-if="!serverCourseCards.length && !progressEntries.length"
                  state="empty"
                  title="暂无学习记录"
                  description="去课程大厅选择课程开始学习吧。"
                />
              </section>
            </div>

            <section class="paper" data-center-calendar>
              <h3>学习日历</h3>
              <div class="calendar" aria-label="学习日历">
                <b v-for="day in calendarDays" :key="day" :style="markedDays.includes(day) ? 'background:#e6f4ff;color:#147bd1' : ''">{{ day < 4 ? '' : day - 3 }}</b>
              </div>
              <div class="calendar-info">
                <h3 style="margin-top:20px">下一次提醒</h3>
                <p class="calendar-detail">
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
                    data-center-server-notification
                  >{{ item.title }}</NuxtLink>
                </div>
                <p v-else class="calendar-detail">暂无新通知</p>
              </div>
            </section>
          </div>
        </main>
        </template>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { usePracticumServer } from '~/composables/usePracticumServer'
import { canViewProgress } from '~/domain/practicum/permissions'
import type { Plan, PracticumNotification } from '~/domain/practicum/types'

const store = usePracticumStore()
const server = usePracticumServer()
const backendStats = ref<Record<string, number> | null>(null)
const serverProgress = ref<{ plans: Array<{ id: string; title: string; status: string; percent: number; total: number; completed: number }>; totals: { total: number; completed: number; percent: number } } | null>(null)
const serverCourseCards = ref<Array<{ plan: Plan; moduleCount: number; activityCount: number }>>([])
const serverNotifications = ref<PracticumNotification[]>([])
const pendingReviewCount = ref(0)
const progressLoading = ref(false)
const progressError = ref(false)
const displayProgressPlans = computed(() => serverProgress.value
  ? serverProgress.value.plans.map(plan => ({ ...plan, source: 'server' as const }))
  : [])
const activePlanCount = computed(() => displayProgressPlans.value.filter(plan => plan.status === 'PUBLISHED').length)
const pendingTaskCount = computed(() => {
  const totals = serverProgress.value?.totals
  return totals ? Math.max(totals.total - totals.completed, 0) : 0
})
const todoCount = computed(() => {
  const totals = serverProgress.value?.totals
  return totals ? Math.max(totals.total - totals.completed, 0) : 0
})
const contextMeta = computed(() => store.state.room.title)
const colors = ['#ff9d45', '#8b75e4', '#49ac86', '#4d8be5']
const calendarDays = Array.from({ length: 35 }, (_, index) => index)
const markedDays = [7, 14, 20, 27]
const nextReminder = computed(() => serverNotifications.value[0]?.title ?? '暂无服务端提醒')

const recentTaskItems = computed(() => {
  const items: { label: string; to: string }[] = []
  if (todoCount.value > 0) {
    items.push({ label: `还有 ${todoCount.value} 个任务待完成`, to: '/practicum/tasks' })
  }
  if (pendingReviewCount.value > 0 && store.state.activeRole === 'OWNER') {
    items.push({ label: `${pendingReviewCount.value} 份作业等待批阅`, to: '/practicum/reviews' })
  }
  if (!items.length) {
    items.push({ label: '去课程大厅浏览课程', to: '/practicum/courses' })
  }
  return items.slice(0, 3)
})

const recentCalendarNotifications = computed(() => {
  return serverNotifications.value.slice(0, 3)
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
  void Promise.all([loadBackendStats(), loadProgress(), loadServerCourses(), loadServerNotifications(), loadPendingReviews()])
})

async function loadProgress() {
  progressLoading.value = true
  progressError.value = false
  try {
    serverProgress.value = await server.getProgress(String(store.state.room.id ?? ''), String(store.state.activeRole ?? 'STUDENT'))
  } catch {
    serverProgress.value = null
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

async function loadServerCourses() {
  try {
    const response = await server.listPlans({
      page: 1,
      pageSize: 6,
      status: store.state.activeRole === 'STUDENT' ? 'PUBLISHED' : undefined,
      sort: 'updatedAt',
      direction: 'desc',
    })
    const plans = response.items.slice(0, 2)
    serverCourseCards.value = await Promise.all(plans.map(async (plan) => {
      try {
        const detail = await server.getPlan(plan.id)
        return {
          plan,
          moduleCount: detail.nodes.filter(node => node.level === 1).length,
          activityCount: detail.nodes.filter(node => node.level === 3).length,
        }
      } catch {
        return { plan, moduleCount: plan.moduleIds?.length ?? 0, activityCount: 0 }
      }
    }))
  } catch {
    serverCourseCards.value = []
  }
}

async function loadServerNotifications() {
  try {
    serverNotifications.value = (await server.listNotifications()).items
  } catch {
    serverNotifications.value = []
  }
}

async function loadPendingReviews() {
  if (store.state.activeRole !== 'OWNER') return
  try {
    pendingReviewCount.value = (await server.listSubmissions({ status: 'SUBMITTED', pageSize: 50 })).total
  } catch {
    pendingReviewCount.value = 0
  }
}
</script>

<style scoped>
.progress-state {
  grid-column: 1 / -1;
}

/* 方案 A 学员中心：保留真实数据请求，仅把信息层级恢复为侧栏 + 欢迎区 + 双栏工作区。 */
.site .dashboard {
  grid-template-columns: 200px minmax(0, 1fr);
  background: #f6f8fa;
}
.site .side {
  padding: 28px 16px;
}
.site .side a {
  min-height: 42px;
  padding: 12px 14px;
  gap: 12px;
  border-radius: 10px;
  font-size: 14px;
}
.site .side a.active {
  color: #147bd1;
  background: #edf7ff;
}
.site .side a .practicum-icon {
  width: 18px;
  height: 18px;
}
.site .dash-main {
  max-width: 1120px;
  padding: 40px 48px;
}
.site .dash-welcome.welcome {
  min-height: 0;
  margin-bottom: 28px;
  padding: 36px 40px;
  color: #17222e;
  background: linear-gradient(165deg, #f5fbff, #fff 62%);
  border: 1px solid #e9edf0;
  border-radius: 16px;
}
.site .dash-welcome.welcome .live-heading {
  display: block;
}
.site .dash-welcome.welcome .live-label {
  margin: 0 0 8px;
  color: #697786;
  font-size: 12px;
  letter-spacing: .08em;
}
.site .dash-welcome.welcome h2 {
  color: #17222e;
  font-size: 32px;
  letter-spacing: -.025em;
}
.site .dash-welcome.welcome p:not(.live-label) {
  margin-top: 10px;
  color: #697786;
  font-size: 15px;
}
.site .dash-welcome.welcome .live-metrics {
  display: none;
}
.site .dash-welcome.welcome .sync-line {
  width: fit-content;
  margin-top: 12px;
  padding: 6px 9px;
  color: #697786;
  background: #f4f7f8;
  border: 1px solid #e9edf0;
}
.site .dash-welcome.welcome .overview-actions {
  margin-top: 16px;
}
.site .dash-welcome.welcome .overview-action,
.site .dash-welcome.welcome .overview-action-primary {
  border-color: #c9e3f8;
  border-radius: 6px;
  color: #147bd1;
  background: #fff;
}
.site .dash-welcome.welcome .overview-action-primary {
  color: #fff;
  background: #147bd1;
  border-color: #147bd1;
}
.site .stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}
.site .stat-row .stat {
  min-height: 116px;
  padding: 24px 28px;
  background: #fff;
  border: 1px solid #e9edf0;
  border-radius: 16px;
}
.site .stat-row .stat .l,
.site .stat-row .stat small {
  color: #697786;
  font-size: 13px;
}
.site .stat-row .stat .v {
  margin-top: 8px;
  color: #17222e;
  font-size: 32px;
  line-height: 1.15;
}
.site .dash-grid {
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, .85fr);
  gap: 16px;
}
.site .dash-grid .paper {
  padding: 28px;
  border-radius: 16px;
}
.site .dash-grid .paper h3 {
  margin-bottom: 20px;
  font-size: 16px;
}
.site .progress-row {
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  gap: 14px;
  min-height: 68px;
  padding: 16px 0;
}
.site .progress-row .thumb {
  width: 48px;
  height: 36px;
  border-radius: 8px;
}
.site .calendar {
  gap: 6px;
}
.site .calendar b {
  padding: 10px 0;
  border-radius: 8px;
}
@media (max-width: 720px) {
  .site .dashboard { grid-template-columns: 54px minmax(0, 1fr); }
  .site .dash-main { padding: 14px; }
  .site .dash-welcome.welcome { padding: 24px; }
  .site .dash-welcome.welcome h2 { font-size: 24px; }
  .site .dash-welcome.welcome p:not(.live-label) { font-size: 13px; }
  .site .stat-row { grid-template-columns: 1fr; gap: 10px; margin-bottom: 16px; }
  .site .stat-row .stat { min-height: 0; padding: 16px 18px; }
  .site .dash-grid { grid-template-columns: 1fr; }
}
</style>
