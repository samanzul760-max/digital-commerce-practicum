<template>
  <ClientOnly>
    <PracticumShell context-title="数据中心" context-meta="学习数据概览">
      <p v-if="isLoading" data-loading class="empty-state">正在加载数据...</p>

      <p v-else-if="!canAccessDataCenter(store.state.activeRole)" data-forbidden class="empty-state">只有管理员可以访问数据中心。</p>

      <p v-else-if="loadError" data-data-center-error class="empty-state" role="alert">数据加载失败，请刷新重试。</p>

      <div v-else data-data-center>
        <!-- Overview metrics -->
        <section data-overview-metrics aria-labelledby="overview-title">
          <h2 id="overview-title">总体概览</h2>
          <div class="metric-strip">
            <div class="metric">
              <span>总体完成率</span>
              <strong>{{ analytics?.overview.overallCompletionPercent ?? 0 }}%</strong>
              <small>所有学员</small>
            </div>
            <div class="metric">
              <span>已完成学员</span>
              <strong>{{ analytics?.overview.completedLearners ?? 0 }}</strong>
              <small>达到全部要求</small>
            </div>
            <div class="metric">
              <span>总学员数</span>
              <strong>{{ analytics?.overview.totalLearners ?? 0 }}</strong>
              <small>当前实训室</small>
            </div>
            <div class="metric">
              <span>未活跃学员</span>
              <strong>{{ analytics?.overview.inactiveLearners ?? 0 }}</strong>
              <small>近期无提交记录</small>
            </div>
          </div>
          <div class="drilldown-links">
            <NuxtLink to="/practicum/members" data-drilldown-members class="text-link">查看成员详情 →</NuxtLink>
            <NuxtLink to="/practicum/plans" data-drilldown-plans class="text-link">查看计划详情 →</NuxtLink>
          </div>
        </section>

        <!-- Plan comparison -->
        <section data-plan-comparison aria-labelledby="compare-title">
          <h2 id="compare-title">计划完成对比</h2>
          <div class="form-panel">
            <table class="data-table" aria-label="计划完成对比">
              <thead>
                <tr><th>计划名称</th><th>状态</th><th>完成率</th><th>学员数</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in (analytics?.plans ?? [])" :key="row.planId">
                  <td>{{ row.title }}</td>
                  <td><span class="status-pill" :class="row.status === 'PUBLISHED' ? '' : 'status-pill-orange'">{{ row.status === 'PUBLISHED' ? '已发布' : row.status === 'DRAFT' ? '草稿' : '已归档' }}</span></td>
                  <td>{{ row.percent }}%</td>
                  <td>{{ row.learnerCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!(analytics?.plans.length)" data-empty class="empty-state">暂无计划数据。</p>
        </section>

        <!-- Live activity feed -->
        <section data-live-activity aria-labelledby="feed-title">
          <h2 id="feed-title">近期活动</h2>
          <div class="form-panel">
            <table class="data-table" aria-label="近期活动">
              <thead>
                <tr><th>学员</th><th>活动</th><th>类型</th><th>时间</th></tr>
              </thead>
              <tbody>
                <tr v-for="(event, i) in (analytics?.activityFeed ?? [])" :key="i">
                  <td>{{ event.learnerLabel }}</td>
                  <td>{{ event.activityTitle }}</td>
                  <td>{{ event.eventType }}</td>
                  <td class="meta">{{ formatTime(event.timestamp) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!(analytics?.activityFeed.length)" data-empty class="empty-state">暂无活动记录。</p>
        </section>

        <section data-audit-log aria-labelledby="audit-title">
          <div class="section-heading">
            <div>
              <h2 id="audit-title">审计记录</h2>
              <p class="meta">仅显示当前实训室最近的受权操作。</p>
            </div>
            <label class="field audit-filter">事件类型
              <select v-model="auditEventType" data-audit-event-filter @change="loadAudit">
                <option value="">全部事件</option>
                <option value="NOTIFICATION_READ">通知已读</option>
              </select>
            </label>
          </div>
          <div class="form-panel">
            <table v-if="auditItems.length" class="data-table" aria-label="审计记录">
              <thead><tr><th>事件</th><th>实体</th><th>操作者角色</th><th>时间</th></tr></thead>
              <tbody>
                <tr v-for="item in auditItems" :key="item.id">
                  <td>{{ item.eventType }}</td>
                  <td>{{ item.entityType }}</td>
                  <td>{{ item.actorRole }}</td>
                  <td class="meta">{{ formatTime(item.occurredAt) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else data-audit-empty class="empty-state">暂无符合条件的审计记录。</p>
          </div>
        </section>

        <!-- Score ranking -->
        <section data-score-ranking aria-labelledby="ranking-title">
          <h2 id="ranking-title">成绩排名</h2>
          <div class="form-panel">
            <table class="data-table" aria-label="成绩排名" role="grid">
              <thead>
                <tr>
                  <th>排名</th>
                  <th><button type="button" data-ranking-header="learner" data-sortable @click="toggleSort('learner')">学员{{ sortIndicator('learner') }}</button></th>
                  <th><button type="button" data-ranking-header="gradedCount" data-sortable @click="toggleSort('gradedCount')">已评分活动{{ sortIndicator('gradedCount') }}</button></th>
                  <th><button type="button" data-ranking-header="avgScore" data-sortable @click="toggleSort('avgScore')">平均分{{ sortIndicator('avgScore') }}</button></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in sortedRanking" :key="i">
                  <td>{{ i + 1 }}</td>
                  <td>{{ row.learnerLabel }}</td>
                  <td>{{ row.gradedCount }}</td>
                  <td>{{ row.avgScore }}%</td>
                </tr>
              </tbody>
            </table>
            <p v-if="sortKey" data-sort-indicator class="meta">按 {{ sortLabel }} {{ sortDir === 'asc' ? '↑ 升序' : '↓ 降序' }} 排列</p>
          </div>
          <p v-if="!sortedRanking.length" data-empty class="empty-state">暂无评分数据。</p>
        </section>

        <!-- Export -->
        <section data-export-section aria-labelledby="export-title">
          <h2 id="export-title">数据导出</h2>
          <div class="form-panel">
            <p>导出为本地 CSV 文件（仅包含匿名化种子数据，不含手机号、密码等个人隐私信息）。</p>
            <button
              v-if="!exportStep"
              data-export-btn
              class="primary-button"
              type="button"
              @click="exportStep = 'confirm'"
            >
              导出 CSV
            </button>
            <div v-if="exportStep === 'confirm'" data-export-summary class="export-summary">
              <p class="meta"><strong>导出字段确认</strong></p>
              <ul class="meta">
                <li>学员编号（匿名化）</li>
                <li>计划名称</li>
                <li>活动名称</li>
                <li>提交状态</li>
                <li>版本数</li>
                <li>评分</li>
              </ul>
              <p class="meta">以上数据仅包含匿名化种子数据，不含手机号、密码等个人隐私信息。</p>
              <div class="export-actions">
                <button
                  data-export-confirm
                  class="primary-button"
                  type="button"
                  :disabled="exportPending"
                  @click="handleExport"
                >
                  {{ exportPending ? '导出中...' : '确认导出' }}
                </button>
                <button
                  data-export-cancel
                  class="ghost-button"
                  type="button"
                  @click="exportStep = null"
                >
                  取消
                </button>
              </div>
            </div>
            <p v-if="exportSuccess" class="meta" data-export-success>导出成功。</p>
            <p v-if="exportError" class="meta" data-export-error style="color: var(--color-danger, #dc2626);">导出失败，请重试。</p>
          </div>
        </section>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { usePracticumStore } from '../../composables/usePracticumStore'
import { canAccessDataCenter } from '../../domain/practicum/permissions'
import type { PracticumAnalytics } from '../../composables/usePracticumServer'

const store = usePracticumStore()
const isLoading = ref(true)
const loadError = ref(false)
const analytics = ref<PracticumAnalytics | null>(null)
const roomId = ref('')
const auditEventType = ref('')
const auditItems = ref<Array<{ id: string; actorRole: string; entityType: string; eventType: string; occurredAt: string }>>([])
const exportStep = ref<'confirm' | null>(null)
const exportPending = ref(false)
const exportSuccess = ref(false)
const exportError = ref(false)
const sortKey = ref<'learner' | 'gradedCount' | 'avgScore' | null>(null)
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(key: 'learner' | 'gradedCount' | 'avgScore') {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function sortIndicator(key: string) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? ' ↑' : ' ↓'
}

const sortLabel = computed(() => {
  const labels: Record<string, string> = { learner: '学员', gradedCount: '已评分活动', avgScore: '平均分' }
  return labels[sortKey.value ?? ''] ?? ''
})

onMounted(loadDashboard)

async function loadDashboard() {
  isLoading.value = true
  loadError.value = false
  try {
    const context = await $fetch<{ room: { id: string } }>('/api/practicum/context')
    roomId.value = context.room.id
    const overview = await $fetch<{ analytics: PracticumAnalytics }>(`/api/practicum/analytics/overview?roomId=${encodeURIComponent(roomId.value)}`)
    analytics.value = overview.analytics
    await loadAudit()
  } catch {
    analytics.value = null
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

async function loadAudit() {
  if (!roomId.value) return
  const query = new URLSearchParams({ roomId: roomId.value })
  if (auditEventType.value) query.set('eventType', auditEventType.value)
  const result = await $fetch<{ items: typeof auditItems.value }>(`/api/practicum/audit?${query.toString()}`)
  auditItems.value = result.items
}

const sortedRanking = computed(() => {
  const list = [...(analytics.value?.ranking ?? [])]
  if (!sortKey.value) return list
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return list.sort((a, b) => {
    if (key === 'learner') return a.learnerLabel.localeCompare(b.learnerLabel) * dir
    return ((a[key] as number) - (b[key] as number)) * dir
  })
})

async function handleExport() {
  exportPending.value = true
  exportSuccess.value = false
  exportError.value = false
  try {
    if (!roomId.value) throw new Error('Current room is unavailable')
    const response = await fetch(`/api/practicum/analytics/export?roomId=${encodeURIComponent(roomId.value)}`)
    if (!response.ok) throw new Error('Analytics export failed')
    const serverCsv = await response.text()
    const url = URL.createObjectURL(new Blob(['\ufeff' + serverCsv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'practicum-data-export.csv'
    a.click()
    URL.revokeObjectURL(url)
    exportSuccess.value = true
    exportStep.value = null
  } catch {
    exportError.value = true
  } finally {
    exportPending.value = false
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
[data-sortable] {
  background: none;
  border: none;
  color: inherit;
  font-weight: 600;
  padding: 0;
  min-height: 44px;
  min-width: 44px;
}
[data-sortable]:hover {
  color: var(--practicum-teal);
}
.drilldown-links {
  display: flex;
  gap: 16px;
  margin-top: 20px;
}
.export-summary {
  margin: 12px 0;
  padding: 12px;
  border: 1px solid var(--practicum-border);
  border-radius: var(--practicum-radius-sm);
}
.export-summary ul {
  margin: 4px 0 8px;
  padding-inline-start: 20px;
}
.export-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>
