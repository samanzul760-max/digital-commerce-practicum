<template>
  <ClientOnly>
    <PracticumShell context-title="审核中心" context-meta="OWNER 审核工作区">
      <p v-if="!canReview(store.state.activeRole)" data-forbidden class="empty-state">你没有访问审核中心的权限。</p>

      <p v-else-if="isLoading" data-review-loading class="empty-state">正在加载审核队列...</p>
      <p v-else-if="loadError" data-review-error class="empty-state" role="alert">审核队列加载失败，请刷新重试。</p>

      <div v-else data-review-queue>
        <div class="page-heading">
          <div>
            <p class="eyebrow">审核中心</p>
            <h1>{{ reviewScope === 'PLAN' ? '计划审核' : '课堂作业审核' }} · {{ processingState === 'PENDING' ? '待处理' : processingState === 'REVIEWED' ? '已处理' : '全部' }}</h1>
            <p>按提交版本查看学生成果和当前状态。</p>
          </div>
          <span class="status-pill">{{ filteredQueue.length }} 份</span>
        </div>

        <div class="review-modes" aria-label="审核视图">
          <div class="review-segment" aria-label="审核范围">
            <button data-review-scope="PLAN" type="button" :aria-pressed="reviewScope === 'PLAN'" @click="reviewScope = 'PLAN'">计划审核</button>
            <button data-review-scope="CLASSROOM" type="button" :aria-pressed="reviewScope === 'CLASSROOM'" @click="reviewScope = 'CLASSROOM'">课堂作业</button>
          </div>
          <div class="review-segment" aria-label="处理状态">
            <button data-processing-state="PENDING" type="button" :aria-pressed="processingState === 'PENDING'" @click="processingState = 'PENDING'">待处理</button>
            <button data-processing-state="REVIEWED" type="button" :aria-pressed="processingState === 'REVIEWED'" @click="processingState = 'REVIEWED'">已处理</button>
          </div>
        </div>

        <div class="review-filters" aria-label="审核队列筛选">
          <label class="field">计划
            <select v-model="planFilter" data-plan-filter>
              <option value="">全部计划</option>
              <option v-for="option in planOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>
          <label class="field">单元
            <select v-model="unitFilter" data-unit-filter>
              <option value="">全部单元</option>
              <option v-for="option in unitOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
            </select>
          </label>
          <label class="field">状态
            <select v-model="statusFilter" data-status-filter>
              <option value="">全部状态</option>
              <option value="SUBMITTED">待审核</option>
              <option value="RETURNED">已退回</option>
              <option value="GRADED">已评分</option>
            </select>
          </label>
          <label class="field">学生
            <input v-model="studentFilter" data-student-filter type="search" placeholder="输入学生名称">
          </label>
          <label class="field">提交顺序
            <select v-model="sortOrder" data-sort-order>
              <option value="oldest">最早提交</option>
              <option value="newest">最新提交</option>
            </select>
          </label>
        </div>

        <p v-if="filteredQueue.length === 0" data-empty class="empty-state">当前筛选条件下没有提交。</p>

        <div v-else class="review-table-wrap">
          <table class="review-table">
            <thead>
              <tr><th>学生</th><th>计划</th><th>单元</th><th>活动</th><th>版本</th><th>提交时间</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredQueue" :key="item.submissionId" data-review-row>
                <td data-label="学生">{{ item.studentLabel }}</td>
                <td data-label="计划">{{ item.planTitle }}</td>
                <td data-label="单元">{{ item.unitTitle }}</td>
                <td data-label="活动">{{ item.activityTitle }}</td>
                <td data-label="版本">版本 {{ item.version }}</td>
                <td data-label="提交时间" data-submitted-time>{{ formatTime(item.submittedAt) }}</td>
                <td data-label="状态"><span data-review-status class="status-pill">{{ statusLabel(item.status) }}</span></td>
                <td data-label="操作"><NuxtLink :to="`/practicum/submissions/${item.submissionId}`" class="text-link">打开审核</NuxtLink></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { SubmissionStatus } from '~/domain/practicum/types'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { canReview } from '~/domain/practicum/permissions'
import { usePracticumServer } from '~/composables/usePracticumServer'

const store = usePracticumStore()
const server = usePracticumServer()
const isLoading = ref(true)
const loadError = ref(false)
const serverQueue = ref<Awaited<ReturnType<typeof server.listSubmissions>>['items']>([])
onMounted(async () => {
  try {
    serverQueue.value = (await server.listSubmissions()).items
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
  }
})
// An empty server response is authoritative; never expose stale browser-only submissions.
const queue = computed(() => serverQueue.value)
const planFilter = ref('')
const unitFilter = ref('')
const statusFilter = ref('')
const studentFilter = ref('')
const sortOrder = ref<'oldest' | 'newest'>('oldest')
const reviewScope = ref<'PLAN' | 'CLASSROOM'>('PLAN')
const processingState = ref<'ALL' | 'PENDING' | 'REVIEWED'>('ALL')
const planOptions = computed(() => uniqueOptions(queue.value.map(item => ({ id: item.planId, label: item.planTitle }))))
const unitOptions = computed(() => uniqueOptions(queue.value.map(item => ({ id: item.unitId, label: item.unitTitle }))))
const filteredQueue = computed(() => queue.value
  .filter(item => item.reviewScope === reviewScope.value)
  .filter(item => statusFilter.value || processingState.value === 'ALL' || (processingState.value === 'PENDING' ? item.status === 'SUBMITTED' : item.status === 'RETURNED' || item.status === 'GRADED'))
  .filter(item => !planFilter.value || item.planId === planFilter.value)
  .filter(item => !unitFilter.value || item.unitId === unitFilter.value)
  .filter(item => !statusFilter.value || item.status === statusFilter.value)
  .filter(item => item.studentLabel.includes(studentFilter.value.trim()))
  .sort((a, b) => {
    const difference = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    return sortOrder.value === 'oldest' ? difference : -difference
  }))

function uniqueOptions(options: Array<{ id: string; label: string }>) {
  return [...new Map(options.map(option => [option.id, option])).values()]
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function statusLabel(status: SubmissionStatus) {
  if (status === 'RETURNED') return '已退回'
  if (status === 'GRADED') return '已评分'
  return '待审核'
}
</script>

<style scoped>
.review-table-wrap { overflow-x: auto; border: 1px solid var(--practicum-border); border-radius: var(--practicum-radius-md); background: #fff; }
.review-modes { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.review-segment { display: inline-grid; grid-auto-flow: column; grid-auto-columns: minmax(112px, 1fr); border: 1px solid var(--practicum-border); border-radius: var(--practicum-radius-sm); overflow: hidden; }
.review-segment button { min-height: 44px; padding: 8px 14px; color: var(--practicum-ink-soft); background: #fff; border: 0; border-right: 1px solid var(--practicum-border); font-weight: 700; }
.review-segment button:last-child { border-right: 0; }
.review-segment button[aria-pressed="true"] { color: #fff; background: var(--practicum-teal); }
.review-filters { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)); gap: 12px; margin-bottom: 16px; }
.review-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.review-table th, .review-table td { padding: 13px 12px; border-bottom: 1px solid var(--practicum-border); text-align: left; vertical-align: middle; }
.review-table th { color: var(--practicum-muted); background: #f7f9fb; font-size: 12px; }
.review-table tbody tr:last-child td { border-bottom: 0; }

@media (max-width: 780px) {
  .review-modes, .review-segment { width: 100%; }
  .review-filters { grid-template-columns: 1fr; }
  .review-table-wrap { overflow: visible; border: 0; background: transparent; }
  .review-table, .review-table tbody, .review-table tr, .review-table td { display: block; }
  .review-table thead { display: none; }
  .review-table tr { margin-bottom: 12px; padding: 10px 14px; background: #fff; border: 1px solid var(--practicum-border); border-radius: var(--practicum-radius-md); }
  .review-table td { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--practicum-border); overflow-wrap: anywhere; }
  .review-table td::before { content: attr(data-label); color: var(--practicum-muted); font-size: 12px; font-weight: 700; }
}
</style>
