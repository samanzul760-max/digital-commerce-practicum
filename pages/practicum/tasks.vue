<template>
  <ClientOnly>
    <PracticumShell context-title="任务" context-meta="集中查看待提交、待修改、已通过和老师反馈">
      <section v-if="!canSubmitWork(store.state.activeRole)" data-forbidden class="permission-empty-state paper">
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
          <div v-else class="todo-list">
            <article v-for="task in paginatedTaskRows" :key="task.id" class="todo-item">
              <div class="todo-type"><span class="status-pill" :class="task.statusClass">{{ task.type }}</span><span>{{ task.status }}</span></div>
              <div class="todo-content"><h3>{{ task.title }}</h3><p>来源：{{ task.source }} · 发布时间：{{ task.publishedAt }}</p></div>
              <NuxtLink :to="`/practicum/activities/${task.id}`" class="blue-btn task-learn-button">{{ task.action === '查看条件' ? '查看条件' : '去学习' }}</NuxtLink>
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
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePracticumStore } from '../../composables/usePracticumStore'
import { canSubmitWork } from '../../domain/practicum/permissions'
import type { ClassroomAssignment } from '../../domain/practicum/types'

const store = usePracticumStore()
const serverAssignments = ref<ClassroomAssignment[]>([])
const serverStudentTasks = ref<Array<{ id: string; activityId: string; status: string; planAssignment: { title: string } }>>([])
const todoPage = ref(1)
const pageSize = 8
onMounted(async () => {
  if (!canSubmitWork(store.state.activeRole)) return
  try {
    const [legacy, current] = await Promise.all([
      $fetch<{ items: ClassroomAssignment[] }>('/api/practicum/assignments'),
      $fetch<{ items: typeof serverStudentTasks.value }>('/api/practicum/student/tasks'),
    ])
    serverAssignments.value = legacy.items
    serverStudentTasks.value = current.items
  } catch {
    serverAssignments.value = []
    serverStudentTasks.value = []
  }
})
const primaryPlan = computed(() => store.visiblePlansFor('STUDENT')[0] ?? null)
const nodes = computed(() => primaryPlan.value ? store.getPlanNodes(primaryPlan.value.id) : [])
const activityNodes = computed(() => nodes.value.filter(node => node.level === 3))
const nextActivity = computed(() => primaryPlan.value ? store.getNextStudentActivity(primaryPlan.value.id) : null)
const pendingTasks = computed(() => activityNodes.value.filter(node => !store.isActivityComplete(node.id) && store.state.practiceSubmissions[node.id]?.status !== 'RETURNED'))
const returnedTasks = computed(() => activityNodes.value.filter(node => store.state.practiceSubmissions[node.id]?.status === 'RETURNED'))
const completedCount = computed(() => activityNodes.value.filter(node => store.isActivityComplete(node.id)).length)
const feedbackCount = computed(() => Object.values(store.state.practiceSubmissions).filter(item => item.feedback).length)
const deadlineLabel = computed(() => {
  if (!primaryPlan.value) return '暂无'
  const raw = store.state.planDeadlines[primaryPlan.value.id]
  if (!raw) return '暂无'
  const d = new Date(raw)
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const activityTaskRows = computed(() => activityNodes.value.slice(0, 8).map(node => {
  const submission = store.state.practiceSubmissions[node.id]
  const activity = store.getActivityByNodeId(node.id)
  const isComplete = store.isActivityComplete(node.id)
  const isReturned = submission?.status === 'RETURNED'
  return {
    id: node.id,
    title: node.title,
    type: activityTypeLabel(activity?.type),
    status: isReturned ? '待修改' : isComplete ? '已完成' : '待提交',
    statusClass: isReturned ? 'status-pill-orange' : isComplete ? '' : 'status-pill-red',
    feedback: submission?.feedback ?? '',
    action: isReturned ? '修改' : isComplete ? '查看' : '进入',
  }
}))
const taskRows = computed(() => [
  ...serverStudentTasks.value.map(task => {
    const node = activityNodes.value.find(item => item.activityId === task.activityId)
    const status = task.status === 'RETURNED' ? '待修改' : task.status === 'GRADED' || task.status === 'CLOSED' ? '已完成' : task.status === 'LOCKED' ? '已锁定' : task.status === 'SUBMITTED' ? '待批阅' : '待提交'
    return { id: node?.id ?? task.activityId, title: node?.title ?? task.activityId, type: activityTypeLabel(store.getActivityByNodeId(node?.id ?? '')?.type), status, statusClass: task.status === 'LOCKED' ? 'status-pill-gray' : task.status === 'RETURNED' ? 'status-pill-orange' : task.status === 'GRADED' ? '' : 'status-pill-red', feedback: '', action: task.status === 'LOCKED' ? '查看条件' : '进入', source: task.planAssignment.title, publishedAt: '服务端已分配' }
  }),
  ...serverAssignments.value.map(assignment => ({ id: assignment.id, title: assignment.title, type: '课堂作业', status: '待完成', statusClass: 'status-pill-red', feedback: assignment.instructions, action: '查看', source: '课堂分配', publishedAt: '待同步' })),
  ...activityTaskRows.value.map(task => ({ ...task, source: primaryPlan.value?.title ?? '课程活动', publishedAt: '本地兼容数据' })),
])
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
