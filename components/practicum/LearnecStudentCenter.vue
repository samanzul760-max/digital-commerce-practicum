<template>
  <ClientOnly>
    <PracticumShell context-title="学员中心" context-meta="课程、任务与成长记录">
      <PracticumStatePanel
        v-if="!canViewProgress(store.state.activeRole)"
        data-center-forbidden
        state="forbidden"
        title="无法访问学员中心"
        description="请登录后以学员身份进入学习工作台。"
      />

      <section v-else class="dashboard" data-od-id="student-center">
        <!-- 左侧导航 -->
        <aside class="side" aria-label="学员中心导航">
          <button
            v-for="item in navItems"
            :key="item.key"
            :class="{ active: activeNav === item.key }"
            type="button"
            @click="navigateTo(item.key)"
          >
            <PracticumIcon :name="item.icon" />
            <span>{{ item.label }}</span>
          </button>
        </aside>

        <!-- 主内容区 -->
        <main class="dash-main">
          <!-- 加载态 -->
          <template v-if="loading">
            <div class="dash-welcome" style="background:#f8fafc">
              <div style="width:100%">
                <div class="skeleton-line" style="width:180px;height:22px;margin-bottom:12px" />
                <div class="skeleton-line" style="width:280px;height:14px" />
              </div>
              <div style="display:flex;gap:9px">
                <div class="skeleton-line" style="width:52px;height:52px;border-radius:50%" />
                <div class="skeleton-line" style="width:52px;height:52px;border-radius:50%" />
                <div class="skeleton-line" style="width:52px;height:52px;border-radius:50%" />
              </div>
            </div>
            <div class="dash-grid">
              <div>
                <section class="paper"><h3>主修的课程</h3>
                  <div v-for="i in 3" :key="i" class="progress-row">
                    <div class="skeleton-line" style="width:37px;height:30px;border-radius:4px" />
                    <div><div class="skeleton-line" style="width:120px;height:12px;margin-bottom:8px" /><div class="skeleton-line" style="width:100%;height:6px;border-radius:9px" /></div>
                    <div class="skeleton-line" style="width:32px;height:14px" />
                  </div>
                </section>
                <section class="paper" style="margin-top:15px"><h3>继续学习</h3>
                  <div class="cards"><div v-for="i in 2" :key="i" style="border:1px solid var(--line);border-radius:6px;overflow:hidden"><div style="height:83px;background:#e8edf0" /><div style="padding:10px"><div class="skeleton-line" style="width:80px;height:12px;margin-bottom:6px" /><div class="skeleton-line" style="width:110px;height:10px" /></div></div></div>
                </section>
              </div>
              <section class="paper"><h3>学习日历</h3>
                <div class="calendar"> <b v-for="i in 35" :key="i" class="skeleton-line" style="height:28px;border-radius:3px;background:#e8edf0" /> </div>
              </section>
            </div>
          </template>

          <!-- 错误态 -->
          <template v-else-if="loadError">
            <div class="dash-welcome" style="background:#fef2f2;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center">
              <PracticumIcon name="file-check" style="width:28px;height:28px;color:#dc2626;margin-bottom:12px" />
              <h2 style="margin:0 0 6px;font-size:18px">学习记录暂时无法加载</h2>
              <p style="margin:0 0 16px;font-size:12px;color:#697786">请检查网络后重试；演示内容不会替代真实学习数据。</p>
              <button class="blue-btn" type="button" @click="loadCenter">重新加载</button>
            </div>
          </template>

          <!-- 数据态 -->
          <template v-else>
            <!-- 欢迎区 + 勋章 -->
            <section class="dash-welcome" data-od-id="student-welcome">
              <div>
                <h2>欢迎回来，{{ displayName }}</h2>
                <p v-if="remainingTaskCount > 0">距离本周学习目标还差 <b>{{ remainingTaskCount }}</b> 个任务，继续保持。</p>
                <p v-else>本周目标已全部完成！继续探索更多课程。</p>
              </div>
              <div class="medals" aria-label="已获得勋章">
                <button
                  v-for="medal in displayMedals"
                  :key="medal.id"
                  :class="['medal', medal.tier]"
                  data-medal
                  :style="{ opacity: medal.achieved ? 1 : 0.35, filter: medal.achieved ? 'none' : 'grayscale(1)' }"
                  :aria-label="`查看${medal.label}`"
                  type="button"
                  @click="selectedMedal = medal"
                >
                  <PracticumIcon :name="medal.achieved ? 'trophy' : 'trophy'" :size="18" />
                </button>
              </div>
            </section>

            <!-- 双栏网格 -->
            <div class="dash-grid">
              <div>
                <!-- 主修课程进度 -->
                <section class="paper" data-od-id="main-progress">
                  <h3>主修的课程</h3>
                  <div v-if="progressPlans.length">
                    <button
                      v-for="plan in progressPlans"
                      :key="plan.id"
                      class="progress-row"
                      type="button"
                      @click="openPlan(plan.id)"
                    >
                      <div class="thumb" :style="{ background: planColors[plan.id] || '#ff9b48' }" />
                      <div>
                        <span>{{ plan.title }}</span>
                        <div class="track"><i :style="{ width: `${plan.percent}%` }" /></div>
                      </div>
                      <b>{{ plan.percent }}%</b>
                    </button>
                  </div>
                  <p v-else style="color:var(--muted);font-size:11px;padding:9px 0">暂无进行中的课程，前往课程大厅开始学习。</p>
                </section>

                <!-- 继续学习 / 推荐卡片 -->
                <section class="paper" style="margin-top:15px" data-od-id="continue-learning">
                  <h3>继续学习</h3>
                  <div class="cards">
                    <template v-if="demoCases.length">
                      <NuxtLink
                        v-for="item in demoCases.slice(0, 2)"
                        :key="item.id"
                        :to="item.to"
                        class="course-card"
                      >
                        <div :class="['course-banner', item.tone]">{{ item.title }}</div>
                        <div class="course-body">
                          <b>{{ item.label }}</b>
                          <span>{{ item.description }}</span>
                        </div>
                      </NuxtLink>
                    </template>
                    <p v-else style="grid-column:1/-1;color:var(--muted);font-size:11px;padding:9px 0">完成更多课程后将显示推荐内容。</p>
                  </div>
                </section>
              </div>

              <!-- 日历 + 提醒 -->
              <section class="paper" data-od-id="learning-calendar">
                <h3>学习日历</h3>
                <div class="calendar">
                  <b
                    v-for="(day, idx) in calendarDays"
                    :key="idx"
                    :style="day.highlight ? 'background:#e6f4ff;color:#147bd1' : day.today ? 'background:var(--blue);color:#fff' : ''"
                  >{{ day.label }}</b>
                </div>

                <!-- 下一次提醒 -->
                <template v-if="nextReminder">
                  <h3 style="margin-top:20px">下一次提醒</h3>
                  <p style="font-size:11px;line-height:1.7;color:#697786;margin-top:6px">
                    {{ nextReminder.time }}<br>
                    <b style="color:#17222e">{{ nextReminder.title }}</b>
                  </p>
                </template>

                <!-- 最近通知 -->
                <template v-if="recentNotifications.length">
                  <h3 style="margin-top:20px">最近通知</h3>
                  <div class="calendar-list">
                    <NuxtLink
                      v-for="item in recentNotifications"
                      :key="item.id"
                      :to="item.targetRoute"
                      class="calendar-list-item"
                    >
                      {{ item.title }}
                    </NuxtLink>
                  </div>
                </template>
              </section>
            </div>

            <!-- 任务区域 -->
            <div v-if="taskEntries.length" class="dash-grid" style="margin-top:15px">
              <section class="paper" style="grid-column:1/-1" data-od-id="recent-tasks">
                <h3>近期任务</h3>
                <button
                  v-for="(entry, idx) in taskEntries"
                  :key="idx"
                  class="progress-row"
                  type="button"
                  @click="navigateTo(entry.to)"
                >
                  <div class="thumb" :style="{ background: entry.color || '#4d8be5' }" />
                  <div>
                    <span>{{ entry.title }}</span>
                    <span style="display:block;margin-top:3px;color:var(--muted);font-size:10px">{{ entry.description }}</span>
                  </div>
                  <b style="color:var(--blue);cursor:pointer">{{ entry.action }}</b>
                </button>
              </section>
            </div>
          </template>
        </main>
      </section>

      <!-- 勋章详情弹窗 -->
      <Teleport to="body">
        <div v-if="selectedMedal" class="dashboard-modal-backdrop" role="presentation" @click.self="selectedMedal = null">
          <div class="dashboard-modal" role="dialog" aria-modal="true" aria-label="勋章详情">
            <PracticumIcon name="trophy" :size="30" style="color:#e6ae3b" />
            <h2>{{ selectedMedal.label }}</h2>
            <p>{{ selectedMedal.achieved ? '你已完成该学习里程碑，继续保持稳定的学习节奏。' : '完成对应的学习任务后即可解锁这枚勋章。' }}</p>
            <button class="retry-button" type="button" @click="selectedMedal = null">知道了</button>
          </div>
        </div>
      </Teleport>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthSession } from '~/composables/useAuthSession'
import { usePracticumServer } from '~/composables/usePracticumServer'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { canViewProgress } from '~/domain/practicum/permissions'
import type { PracticumNotification } from '~/domain/practicum/types'

interface ProgressPlan {
  id: string
  title: string
  total: number
  completed: number
  percent: number
}

interface ProgressTotals {
  total: number
  completed: number
  percent: number
}

interface MedalDisplay {
  id: string
  label: string
  tier: 'gold' | 'silver' | 'bronze'
  achieved: boolean
}

interface DemoCaseItem {
  id: string
  title: string
  label: string
  description: string
  to: string
  tone: string
}

interface TaskEntry {
  title: string
  description: string
  to: string
  action: string
  color: string
}

interface Reminder {
  time: string
  title: string
}

const auth = useAuthSession()
const store = usePracticumStore()
const workspace = useWorkspaceContext()
const server = usePracticumServer()

const loading = ref(true)
const loadError = ref(false)
const activeNav = ref('overview')
const selectedMedal = ref<MedalDisplay | null>(null)

const progressPlans = ref<ProgressPlan[]>([])
const progressTotals = ref<ProgressTotals>({ total: 0, completed: 0, percent: 0 })
const notifications = ref<PracticumNotification[]>([])
const medals = ref<MedalDisplay[]>([])

const navItems = [
  { key: 'overview', label: '概况', icon: 'dashboard' },
  { key: 'courses', label: '我的课程', icon: 'book' },
  { key: 'tasks', label: '任务', icon: 'clipboard-check' },
  { key: 'achievements', label: '成就', icon: 'trophy' },
]

const planColors: Record<string, string> = {
  plan_1: '#ff9d45',
  plan_2: '#8b75e4',
  plan_3: '#49ac86',
}

const displayName = computed(() => {
  return auth.state.value.user?.displayName ?? workspace.state.value.user?.displayName ?? '同学'
})

const remainingTaskCount = computed(() => {
  return Math.max(progressTotals.value.total - progressTotals.value.completed, 0)
})

const displayMedals = computed<MedalDisplay[]>(() => {
  if (medals.value.length) return medals.value
  return [
    { id: 'demo-1', label: '实训启程', tier: 'gold', achieved: true },
    { id: 'demo-2', label: '持续成长', tier: 'silver', achieved: true },
    { id: 'demo-3', label: '作品集新星', tier: 'bronze', achieved: false },
  ]
})

const demoCases = computed<DemoCaseItem[]>(() => {
  return [
    {
      id: 'title-optimization',
      title: '商品标题优化',
      label: '店铺运营',
      description: '12 节课程 · 实操项目',
      to: '/practicum/courses',
      tone: 'orange',
    },
    {
      id: 'detail-materials',
      title: '详情页素材方案',
      label: '视觉转化',
      description: '6 节课程 · 改稿训练',
      to: '/practicum/tasks',
      tone: 'blue',
    },
  ]
})

const taskEntries = computed<TaskEntry[]>(() => {
  if (progressPlans.value.length) {
    return progressPlans.value.slice(0, 3).map((plan, i) => ({
      title: plan.title,
      description: `${plan.completed} / ${plan.total} 项任务已完成`,
      to: '/practicum/tasks',
      action: '继续',
      color: Object.values(planColors)[i] || '#4d8be5',
    }))
  }
  return [
    { title: '商品标题优化', description: '查看课程进度和学习目标', to: '/practicum/courses', action: '查看', color: '#ff9d45' },
    { title: '店铺首页诊断', description: '完成诊断任务并提交分析', to: '/practicum/shop/products', action: '进入', color: '#4d8be5' },
  ]
})

const recentNotifications = computed(() => {
  return notifications.value.slice(0, 3)
})

const nextReminder = computed<Reminder | null>(() => {
  if (notifications.value.length) {
    const first = notifications.value[0]
    return { time: formatDate(first.createdAt), title: first.title }
  }
  return { time: '周五 19:30', title: '直播复盘：商品详情页优化' }
})

// 35格日历
const calendarDays = computed(() => {
  const now = new Date()
  const today = now.getDate()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
  const days: { label: string; highlight: boolean; today: boolean }[] = []

  for (let i = 0; i < 35; i++) {
    const dayNum = i - firstDayOfMonth + 1
    const valid = dayNum >= 1 && dayNum <= 31
    days.push({
      label: valid ? String(dayNum) : '',
      highlight: [7, 14, 20, 27].includes(i),
      today: dayNum === today,
    })
  }
  return days
})

onMounted(async () => {
  const user = await auth.load()
  if (user) store.switchRole(user.role)
  await workspace.load()
  await loadCenter()
})

async function loadCenter() {
  loading.value = true
  loadError.value = false
  try {
    const roomId = workspace.state.value.room?.id
    if (!roomId || !store.state.activeRole) throw new Error('当前实训室或账号身份不可用。')

    const [progressResult, notificationResult] = await Promise.allSettled([
      server.getProgress(roomId, store.state.activeRole),
      server.listNotifications(),
    ])

    if (progressResult.status === 'fulfilled') {
      progressPlans.value = progressResult.value.plans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        total: plan.total,
        completed: plan.completed,
        percent: plan.percent,
      }))
      progressTotals.value = progressResult.value.totals
    } else {
      progressPlans.value = []
      progressTotals.value = { total: 0, completed: 0, percent: 0 }
    }

    notifications.value = notificationResult.status === 'fulfilled'
      ? notificationResult.value.items
      : []

    // 勋章使用演示数据；后续对接服务端成就 API
    medals.value = []
  } catch {
    progressPlans.value = []
    progressTotals.value = { total: 0, completed: 0, percent: 0 }
    notifications.value = []
    medals.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function navigateTo(key: string) {
  activeNav.value = key
  const routes: Record<string, string> = {
    overview: '/center',
    courses: '/practicum/courses',
    tasks: '/practicum/tasks',
    achievements: '/practicum/achievements',
  }
  const target = routes[key]
  if (target && target !== window.location.pathname) {
    window.location.href = target
  }
}

function openPlan(planId: string) {
  window.location.href = `/practicum/tasks`
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  } catch {
    return value
  }
}
</script>

<style scoped>
/* skeleton shimmer 复用 */
.skeleton-line {
  display: block;
  overflow: hidden;
  border-radius: 7px;
  background: #e8eef5;
  position: relative;
}
.skeleton-line::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.7), transparent);
  transform: translateX(-100%);
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { to { transform: translateX(100%); } }

/* 弹窗 */
.dashboard-modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(23, 34, 46, .28);
  padding: 20px;
}
.dashboard-modal {
  width: min(380px, 100%);
  border-radius: 16px;
  background: #fff;
  color: #263445;
  padding: 30px;
  text-align: center;
  box-shadow: 0 20px 55px rgba(23, 34, 46, .2);
}
.dashboard-modal h2 { margin: 12px 0 8px; font-size: 20px; }
.dashboard-modal p { margin: 0 0 22px; color: #697786; font-size: 14px; line-height: 1.6; }

/* 交互增强 */
.progress-row {
  display: grid;
  grid-template-columns: 38px 1fr 46px;
  gap: 9px;
  align-items: center;
  padding: 9px 0;
  border: 0;
  border-top: 1px solid #f0f2f3;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font: 11px inherit;
  color: inherit;
}
.progress-row:first-of-type { border-top: 0; padding-top: 0; }
.progress-row:hover { background: #fafcfd; }
.progress-row b { text-align: right; }
.course-card { text-decoration: none; color: inherit; }

.retry-button {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  padding: 8px 14px;
  font: 500 13px/20px inherit;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-line::after { animation: none; }
}
</style>
