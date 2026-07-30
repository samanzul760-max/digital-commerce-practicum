<template>
  <ClientOnly>
    <PracticumShell context-title="数据中心" context-meta="学习数据概览">
      <p v-if="isLoading" data-loading class="empty-state">正在加载数据...</p>

      <p v-else-if="loadError" data-data-center-error class="empty-state" role="alert">数据加载失败，请刷新重试。</p>

          <p v-else-if="!canAccessDataCenter(store.state.activeRole)" data-forbidden class="empty-state">只有管理员可以访问数据中心。</p>

      <div v-else data-data-center>
        <!-- Overview metrics -->
        <section data-overview-metrics aria-labelledby="overview-title">
          <h2 id="overview-title">总体概览</h2>
          <div class="metric-strip">
            <div class="metric">
              <span>总体完成率</span>
              <strong>{{ analytics?.overview.overallCompletionPercent ?? overallCompletion.percent }}%</strong>
              <small>所有学员</small>
            </div>
            <div class="metric">
              <span>已完成学员</span>
              <strong>{{ analytics?.overview.completedLearners ?? completedLearners }}</strong>
              <small>达到全部要求</small>
            </div>
            <div class="metric">
              <span>总学员数</span>
              <strong>{{ analytics?.overview.totalLearners ?? totalLearners }}</strong>
              <small>当前实训室</small>
            </div>
            <div class="metric">
              <span>未活跃学员</span>
              <strong>{{ analytics?.overview.inactiveLearners ?? inactiveLearners }}</strong>
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
                <tr v-for="row in (analytics?.plans ?? planComparison)" :key="row.planId">
                  <td>{{ row.title }}</td>
                  <td><span class="status-pill" :class="row.status === 'PUBLISHED' ? '' : 'status-pill-orange'">{{ row.status === 'PUBLISHED' ? '已发布' : row.status === 'DRAFT' ? '草稿' : '已归档' }}</span></td>
                  <td>{{ row.percent }}%</td>
                  <td>{{ row.learnerCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!planComparison.length" data-empty class="empty-state">暂无计划数据。</p>
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
                <tr v-for="(event, i) in (analytics?.activityFeed ?? activityFeed)" :key="i">
                  <td>{{ event.learnerLabel }}</td>
                  <td>{{ event.activityTitle }}</td>
                  <td>{{ event.eventType }}</td>
                  <td class="meta">{{ formatTime(event.timestamp) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!activityFeed.length" data-empty class="empty-state">暂无活动记录。</p>
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
          <p v-if="!scoreRanking.length" data-empty class="empty-state">暂无评分数据。</p>
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
import { usePracticumServer, type PracticumAnalytics } from '../../composables/usePracticumServer'

const store = usePracticumStore()
const server = usePracticumServer()
const isLoading = ref(true)
const loadError = ref(false)
const serverStats = ref<Record<string, number> | null>(null)
const analytics = ref<PracticumAnalytics | null>(null)
const exportStep = ref<'confirm' | null>(null)
const exportPending = ref(false)
const exportSuccess = ref(false)
const exportError = ref(false)
const sortKey = ref<'learner' | 'gradedCount' | 'avgScore' | null>(null)
const sortDir = ref<'asc' | 'desc'>('desc')

const LEARNER_LABELS = ['学员 A', '学员 B', '学员 C', '学员 D', '学员 E']

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

onMounted(async () => {
  try {
    serverStats.value = (await server.getStats('room-001')).stats
    analytics.value = await server.getAnalytics('room-001')
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
  }
})

const publishedPlan = computed(() => store.state.plans.find(p => p.status === 'PUBLISHED'))

const totalLearners = computed(() => (serverStats.value?.memberCount ?? store.state.members.filter(m => m.role === 'STUDENT').length) || 1)

const allSubmissions = computed(() => Object.entries(store.state.practiceSubmissions))

const completedLearners = computed(() => {
  // A learner is "complete" if they have at least one GRADED submission
  const gradedLearners = new Set(
    allSubmissions.value
      .filter(([, s]) => s.status === 'GRADED')
      .map(([, s]) => s.studentId)
      .filter(Boolean)
  )
  return gradedLearners.size
})

const inactiveLearners = computed(() => Math.max(0, totalLearners.value - allSubmissions.value.length))

const overallCompletion = computed(() => {
  if (serverStats.value && serverStats.value.activityCount > 0) {
    const total = serverStats.value.activityCount * totalLearners.value
    return { percent: total ? Math.round((serverStats.value.gradedSubmissionCount / total) * 100) : 0 }
  }
  if (!publishedPlan.value) return { percent: 0 }
  const activityCount = store.state.nodes.filter(n => n.planId === publishedPlan.value!.id && n.level === 3).length
  const total = activityCount * totalLearners.value
  let graded = 0
  for (const [, s] of allSubmissions.value) {
    if (s.status === 'GRADED') graded++
  }
  return { percent: total ? Math.round((graded / total) * 100) : 0 }
})

const planComparison = computed(() => {
  return store.state.plans.map(p => {
    const activityCount = store.state.nodes.filter(n => n.planId === p.id && n.level === 3).length
    const submissions = allSubmissions.value.filter(([nodeId]) =>
      store.state.nodes.some(n => n.id === nodeId && n.planId === p.id)
    )
    const gradedCount = submissions.filter(([, s]) => s.status === 'GRADED').length
    return {
      planId: p.id,
      title: p.title,
      status: p.status,
      percent: activityCount && totalLearners.value ? Math.round((gradedCount / (activityCount * totalLearners.value)) * 100) : 0,
      learnerCount: totalLearners.value,
    }
  })
})

const activityFeed = computed(() => {
  const events: { learnerLabel: string; activityTitle: string; eventType: string; timestamp: string }[] = []
  let idx = 0
  for (const [nodeId, sub] of allSubmissions.value) {
    const node = store.state.nodes.find(n => n.id === nodeId)
    const label = LEARNER_LABELS[idx % LEARNER_LABELS.length]
    for (const v of sub.versions) {
      events.push({
        learnerLabel: label,
        activityTitle: node?.title ?? '未知活动',
        eventType: '提交',
        timestamp: v.submittedAt,
      })
    }
    if (sub.status === 'RETURNED') {
      events.push({
        learnerLabel: label,
        activityTitle: node?.title ?? '未知活动',
        eventType: '退回',
        timestamp: sub.feedbackEntries?.at(-1)?.createdAt ?? new Date().toISOString(),
      })
    }
    if (sub.status === 'GRADED' && sub.grade) {
      events.push({
        learnerLabel: label,
        activityTitle: node?.title ?? '未知活动',
        eventType: '评分',
        timestamp: sub.grade.createdAt,
      })
    }
    idx++
  }
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20)
})

const scoreRanking = computed(() => {
  // Aggregate scores by learner
  const learnerScores: Record<string, { total: number; count: number }> = {}
  for (const [, sub] of allSubmissions.value) {
    if (sub.status === 'GRADED' && sub.grade && sub.studentId) {
      const id = sub.studentId
      if (!learnerScores[id]) learnerScores[id] = { total: 0, count: 0 }
      const rubricValues = Object.values(sub.grade.rubricScores)
      const maxPossible = rubricValues.length * 40
      const actual = rubricValues.reduce((a, b) => a + b, 0)
      const pct = maxPossible ? Math.round((actual / maxPossible) * 100) : 0
      learnerScores[id].total += pct
      learnerScores[id].count++
    }
  }
  return Object.entries(learnerScores)
    .map(([_id, scores], i) => ({
      learnerLabel: LEARNER_LABELS[i] ?? `学员 ${i + 1}`,
      gradedCount: scores.count,
      avgScore: Math.round(scores.total / scores.count),
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
})

const sortedRanking = computed(() => {
  const list = [...(analytics.value?.ranking ?? scoreRanking.value)]
  if (!sortKey.value) return list
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return list.sort((a, b) => {
    if (key === 'learner') return a.learnerLabel.localeCompare(b.learnerLabel) * dir
    return ((a[key] as number) - (b[key] as number)) * dir
  })
})

function handleExport() {
  exportPending.value = true
  exportSuccess.value = false
  exportError.value = false
  try {
    const headers = '学员编号,计划名称,活动名称,状态,版本数,评分'
    const rows: string[] = []
    for (const [nodeId, sub] of allSubmissions.value) {
      const node = store.state.nodes.find(n => n.id === nodeId)
      const plan = store.state.plans.find(p => p.id === node?.planId)
      const grade = sub.grade ? Object.values(sub.grade.rubricScores).reduce((a, b) => a + b, 0).toString() : ''
      // Use anonymized learner labels
      const studentIds = [...new Set(
        Object.values(store.state.practiceSubmissions).map(s => s.studentId).filter(Boolean)
      )]
      const sIdx = studentIds.indexOf(sub.studentId ?? '')
      const label = sIdx >= 0 ? LEARNER_LABELS[sIdx] ?? `学员 ${sIdx + 1}` : sub.studentId ?? 'student-001'
      rows.push(`${label},${plan?.title ?? ''},${node?.title ?? ''},${sub.status},${sub.versions.length},${grade}`)
    }
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
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
