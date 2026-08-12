<template>
    <PracticumShell context-title="任务" context-meta="集中查看待提交、待修改、已通过和老师反馈">
      <section v-if="!canSubmitWork(effectiveRole)" data-forbidden class="permission-empty-state paper">
        <div class="permission-empty-icon" aria-hidden="true">
          <PracticumIcon name="switch" />
        </div>
        <h1>学生任务页仅学生视角可用</h1>
        <p>切换身份后即可查看待提交任务、老师反馈与学习进度。</p>
        <button data-switch-to-student class="blue-btn" type="button" @click="switchToStudentView">
          <PracticumIcon name="switch" />
          切换至学生视角
        </button>
      </section>

      <section v-else data-student-tasks class="dashboard-page">
        <div class="section-heading">
          <div>
            <h1>我的任务</h1>
            <p>集中查看待提交、待修改和老师反馈。</p>
          </div>
          <NuxtLink v-if="nextActivity" :to="`/practicum/activities/${nextActivity.id}`" class="blue-btn">进入下一项</NuxtLink>
        </div>

        <div class="metric-strip task-metric-strip" data-task-metrics>
          <div class="metric paper"><span>待提交</span><strong>{{ pendingTasks.length }}</strong><small>最近截止 {{ deadlineLabel }}</small></div>
          <div class="metric paper"><span>待修改</span><strong>{{ returnedTasks.length }}</strong><small>来自老师反馈</small></div>
          <div class="metric paper"><span>已完成</span><strong>{{ completedCount }}</strong><small>当前计划累计</small></div>
          <div class="metric paper"><span>老师反馈</span><strong>{{ feedbackCount }}</strong><small>建议优先查看</small></div>
        </div>

        <section class="todo-panel paper" data-server-todo-list>
          <div class="todo-panel-head">
            <div><h2>待办列表</h2><p>{{ taskRows.length }} 条待办任务</p></div>
            <NuxtLink to="/practicum/courses" class="secondary-button compact-action">浏览课程</NuxtLink>
          </div>
          <PracticumStatePanel v-if="!taskRows.length" state="empty" title="暂无待办任务" description="计划分配到班级后，学生会在这里看到可学习的任务。" />
          <PracticumStatePanel v-if="tasksLoading" state="loading" title="正在加载任务" description="正在同步当前实训室的任务状态。" />
          <PracticumStatePanel v-else-if="tasksError" state="error" title="任务加载失败" description="服务端暂时不可用，请稍后刷新重试。" />
          <PracticumStatePanel v-else-if="!taskRows.length" state="empty" title="暂无待办任务" description="计划分配到班级后，学生会在这里看到可学习的任务。" />
          <div v-else class="todo-list">
            <article v-for="task in paginatedTaskRows" :key="task.id" class="todo-item" data-student-task-row :data-task-id="task.id">
              <div class="todo-type"><span class="status-pill" :class="task.statusClass">{{ task.type }}</span><span data-task-status>{{ task.status }}</span></div>
              <div class="todo-content"><h3>{{ task.title }}</h3><p>来源：{{ task.source }} · 发布时间：{{ task.publishedAt }}</p></div>
              <NuxtLink :to="{ path: `/practicum/activities/${task.activityId}`, query: { taskId: task.id } }" class="blue-btn task-learn-button">{{ task.action === '查看条件' ? '查看条件' : '去学习' }}</NuxtLink>
            </article>
          </div>
          <nav v-if="taskRows.length > pageSize" class="todo-pagination" aria-label="待办分页">
            <button type="button" class="secondary-button compact-action" :disabled="todoPage === 1" @click="todoPage--">上一页</button>
            <span>第 {{ todoPage }} / {{ totalTodoPages }} 页</span>
            <button type="button" class="secondary-button compact-action" :disabled="todoPage === totalTodoPages" @click="todoPage++">下一页</button>
          </nav>
        </section>
      </section>
    </PracticumShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePracticumStore } from '../../composables/usePracticumStore'
import { canSubmitWork } from '../../domain/practicum/permissions'
import { useAuthSession } from '../../composables/useAuthSession'
import { usePracticumServer } from '../../composables/usePracticumServer'

const store = usePracticumStore()
const auth = useAuthSession()
const server = usePracticumServer()
const effectiveRole = computed(() => store.state.activeRole || auth.state.value.user?.role || null)
const serverStudentTasks = ref<Awaited<ReturnType<typeof server.listStudentTasks>>['items']>([])
const tasksLoading = ref(true)
const tasksError = ref(false)
const todoPage = ref(1)
const pageSize = 8
onMounted(async () => {
  if (!canSubmitWork(effectiveRole.value)) return
  try {
    const current = await server.listStudentTasks()
    serverStudentTasks.value = current.items
    tasksError.value = false
  } catch {
    serverStudentTasks.value = []
    tasksError.value = true
  } finally {
    tasksLoading.value = false
  }
})
const nextActivity = computed(() => {
  const next = serverStudentTasks.value.find(task => task.status === 'AVAILABLE' || task.status === 'RETURNED')
  return next ? { id: next.activityId } : null
})
const pendingTasks = computed(() => serverStudentTasks.value.filter(task => !['SUBMITTED', 'GRADED', 'CLOSED'].includes(task.status)))
const returnedTasks = computed(() => serverStudentTasks.value.filter(task => task.status === 'RETURNED'))
const completedCount = computed(() => serverStudentTasks.value.filter(task => ['GRADED', 'CLOSED'].includes(task.status)).length)
const feedbackCount = computed(() => serverStudentTasks.value.filter(task => ['RETURNED', 'GRADED'].includes(task.status)).length)
const deadlineLabel = computed(() => {
  const deadlines = serverStudentTasks.value
    .map(task => task.dueAt)
    .filter((value): value is string => Boolean(value))
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  const d = deadlines[0]
  if (!d) return '暂无'
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const taskRows = computed(() => serverStudentTasks.value.map(task => ({
  id: task.id,
  activityId: task.activityId,
  title: task.source.title,
  type: '学习活动',
  status: task.status === 'RETURNED' ? '待修改' : task.status === 'GRADED' || task.status === 'CLOSED' ? '已完成' : task.status === 'SUBMITTED' ? '待批阅' : task.status === 'LOCKED' ? '已锁定' : '待提交',
  statusClass: task.status === 'LOCKED' ? 'status-pill-gray' : task.status === 'RETURNED' ? 'status-pill-orange' : task.status === 'GRADED' ? '' : 'status-pill-red',
  feedback: '',
  action: task.status === 'LOCKED' ? '查看条件' : '进入学习',
  source: task.source.title,
  publishedAt: new Date(task.availableAt).toLocaleDateString('zh-CN'),
})))
const totalTodoPages = computed(() => Math.max(1, Math.ceil(taskRows.value.length / pageSize)))
const paginatedTaskRows = computed(() => taskRows.value.slice((todoPage.value - 1) * pageSize, todoPage.value * pageSize))

function activityTypeLabel(type?: string) {
  if (type === 'SOFTWARE_ACTION') return '软件操作'
  if (type === 'TRAINING') return '训练活动'
  if (type === 'PRACTICE_ACTIVITY') return '实践提交'
  return '学习活动'
}

function switchToStudentView() {
  store.switchRole('STUDENT')
}
</script>
