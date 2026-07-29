<template>
  <ClientOnly>
    <PracticumShell context-title="任务" context-meta="集中查看待提交、待修改、已通过和老师反馈">
      <section v-if="!canSubmitWork(store.state.activeRole)" data-forbidden class="empty-state">
        学生任务页仅学生视角可用。请切换到学生视角后查看。
      </section>

      <section v-else data-student-tasks class="dashboard-page">
        <div class="section-heading">
          <div>
            <h1>我的任务</h1>
            <p>集中查看待提交、待修改和老师反馈。</p>
          </div>
          <NuxtLink v-if="nextActivity" :to="`/practicum/activities/${nextActivity.id}`" class="primary-button">进入下一项</NuxtLink>
        </div>

        <div class="metric-strip">
          <div class="metric"><span>待提交</span><strong>{{ pendingTasks.length }}</strong><small>最近截止 {{ deadlineLabel }}</small></div>
          <div class="metric"><span>待修改</span><strong>{{ returnedTasks.length }}</strong><small>来自老师反馈</small></div>
          <div class="metric"><span>已完成</span><strong>{{ completedCount }}</strong><small>当前计划累计</small></div>
          <div class="metric"><span>老师反馈</span><strong>{{ feedbackCount }}</strong><small>建议优先查看</small></div>
        </div>

        <section class="table-panel">
          <div class="panel-head">
            <div>
              <strong>任务列表</strong>
              <span>按状态和学习顺序展示</span>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>任务</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>老师反馈</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in taskRows" :key="task.id">
                  <td>{{ task.title }}</td>
                  <td>{{ task.type }}</td>
                  <td><span class="status-pill" :class="task.statusClass">{{ task.status }}</span></td>
                  <td>{{ task.feedback || '暂无' }}</td>
                  <td><NuxtLink :to="`/practicum/activities/${task.id}`" class="secondary-button compact-action">{{ task.action }}</NuxtLink></td>
                </tr>
              </tbody>
            </table>
          </div>
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
onMounted(async () => {
  if (!canSubmitWork(store.state.activeRole)) return
  try { serverAssignments.value = (await $fetch<{ items: ClassroomAssignment[] }>('/api/practicum/assignments')).items } catch { serverAssignments.value = [] }
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
  ...serverAssignments.value.map(assignment => ({ id: assignment.id, title: assignment.title, type: '课堂作业', status: '待完成', statusClass: 'status-pill-red', feedback: assignment.instructions, action: '查看' })),
  ...activityTaskRows.value,
])

function activityTypeLabel(type?: string) {
  if (type === 'SOFTWARE_ACTION') return '软件操作'
  if (type === 'TRAINING') return '训练活动'
  if (type === 'PRACTICE_ACTIVITY') return '实践提交'
  return '学习活动'
}
</script>
