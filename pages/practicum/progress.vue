<template>
  <ClientOnly>
    <PracticumShell context-title="成长数据" :context-meta="contextMeta">
      <!-- Loading -->
      <div v-if="isLoading" data-loading class="empty-state">正在加载成长数据...</div>

      <!-- Error -->
      <div v-else-if="loadError" data-error class="empty-state">
        <p>加载成长数据时出现问题。</p>
        <button type="button" class="secondary-button compact-action" style="margin-top:10px" @click="retryLoad">重新加载</button>
      </div>

      <!-- Forbidden -->
      <p v-else-if="!canViewProgress(store.state.activeRole)" data-forbidden class="empty-state">你没有访问成长数据页面的权限。</p>

      <!-- Student growth data -->
      <div v-else-if="store.state.activeRole === 'STUDENT'" data-student-growth>
        <!-- Growth radar + overview -->
        <section data-growth-overview class="growth-overview-band" aria-labelledby="growth-title">
          <div class="growth-title-row">
            <h2 id="growth-title">能力雷达</h2>
            <span class="growth-meta">{{ contextMeta }}</span>
          </div>
          <div v-if="!growthDimensions.length" data-empty-growth class="empty-state">暂无成长数据。完成实训活动并收到评分后，这里会展示你的能力雷达图。</div>
          <div v-else class="growth-radar-wrap">
            <svg
              data-radar-chart
              :viewBox="`0 0 ${radarSize} ${radarSize}`"
              :width="radarSize"
              :height="radarSize"
              :aria-label="radarAriaLabel"
              role="img"
            >
              <!-- Grid rings -->
              <circle
                v-for="ring in 4" :key="'ring-' + ring"
                :cx="radarCx" :cy="radarCy"
                :r="radarR * ring / 4"
                fill="none" :stroke="gridColor" stroke-width="1"
              />
              <!-- Axes -->
              <line
                v-for="(_, i) in growthDimensions" :key="'axis-' + i"
                :x1="radarCx" :y1="radarCy"
                :x2="radarCx + radarR * Math.cos(angle(i))"
                :y2="radarCy + radarR * Math.sin(angle(i))"
                :stroke="gridColor" stroke-width="0.5"
              />
              <!-- Data polygon -->
              <polygon
                v-if="growthDimensions.length"
                :points="radarPoints"
                fill="var(--growth-accent, #2563eb)"
                fill-opacity="0.12"
                stroke="var(--growth-accent, #2563eb)"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <!-- Data dots -->
              <circle
                v-for="(dim, i) in growthDimensions" :key="'dot-' + i"
                :cx="radarCx + (radarR * dim.score / dim.maxScore) * Math.cos(angle(i))"
                :cy="radarCy + (radarR * dim.score / dim.maxScore) * Math.sin(angle(i))"
                r="3.5"
                fill="var(--growth-accent, #2563eb)"
                stroke="#fff"
                stroke-width="1.5"
              />
              <!-- Labels -->
              <text
                v-for="(dim, i) in growthDimensions" :key="'label-' + i"
                :x="radarCx + (radarR + 24) * Math.cos(angle(i))"
                :y="radarCy + (radarR + 24) * Math.sin(angle(i))"
                text-anchor="middle"
                dominant-baseline="central"
                font-size="12"
                font-weight="500"
                fill="var(--practicum-ink-soft)"
                font-family="Microsoft YaHei UI, PingFang SC, sans-serif"
              >{{ dim.label }}</text>
            </svg>
            <div class="growth-quick-stats">
              <div class="gqs-item">
                <span class="gqs-value">{{ avgScore }}</span>
                <span class="gqs-label">综合评分</span>
              </div>
              <div class="gqs-item">
                <span class="gqs-value mastered">{{ masteredCount }}</span>
                <span class="gqs-label">已掌握</span>
              </div>
              <div class="gqs-item">
                <span class="gqs-value weak">{{ weakCount }}</span>
                <span class="gqs-label">需加强</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Growth dimension cards -->
        <section v-if="growthDimensions.length" data-growth-dimensions aria-labelledby="dimensions-title">
          <h2 id="dimensions-title" class="section-heading">能力详情</h2>
          <div class="growth-dim-grid">
            <div
              v-for="dim in growthDimensions"
              :key="dim.key"
              :data-growth-dim="dim.key"
              :class="['growth-dim-card', dim.score >= 60 ? 'growth-dim-mastered' : 'growth-dim-weak']"
            >
              <div class="growth-dim-head">
                <span class="growth-dim-name">{{ dim.label }}</span>
                <span :class="['growth-dim-score', dim.score >= 60 ? 'score-mastered' : 'score-weak']">{{ dim.score }}</span>
              </div>
              <div class="growth-dim-track">
                <span class="growth-dim-fill" :style="{ width: dim.score + '%' }" />
              </div>
              <span class="growth-dim-status">{{ dim.score >= 60 ? '已掌握' : '需要加强' }}</span>
            </div>
          </div>
        </section>

        <!-- Existing sections: overall + module progress, returned work, rubric, timeline (preserved from prior student view) -->
        <section data-overall-progress class="progress-band" aria-labelledby="overall-title" style="margin-top:24px">
          <h2 id="overall-title">总体进度</h2>
          <div class="progress-track" role="progressbar" :aria-label="`计划完成进度 ${planProgress.percent}%`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="planProgress.percent">
            <span :style="{ width: `${planProgress.percent}%` }" />
          </div>
          <div class="progress-number">{{ planProgress.percent }}%<small>{{ planProgress.completed }} / {{ planProgress.total }} 活动</small></div>
        </section>

        <section data-module-progress aria-labelledby="modules-title">
          <h2 id="modules-title" class="section-heading">模块进度</h2>
          <div v-for="mod in moduleList" :key="mod.id" class="form-panel">
            <h3>{{ mod.title }}</h3>
            <div class="progress-track" role="progressbar" :aria-label="`${mod.title} ${moduleProgressMap[mod.id]?.percent ?? 0}%`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="moduleProgressMap[mod.id]?.percent ?? 0">
              <span :style="{ width: `${moduleProgressMap[mod.id]?.percent ?? 0}%` }" />
            </div>
            <p class="meta">{{ moduleProgressMap[mod.id]?.completed ?? 0 }} / {{ moduleProgressMap[mod.id]?.total ?? 0 }} 活动</p>
            <div v-for="unit in unitsForModule(mod.id)" :key="unit.id" class="unit-row">
              <span>{{ unit.title }}</span>
              <span class="meta">{{ unitProgressMap[unit.id]?.completed ?? 0 }} / {{ unitProgressMap[unit.id]?.total ?? 0 }}</span>
            </div>
          </div>
          <p v-if="!moduleList.length" data-empty class="empty-state">暂无已发布的教学模块。</p>
        </section>

        <section data-returned-work aria-labelledby="returned-title">
          <h2 id="returned-title" class="section-heading">待修改作业</h2>
          <div v-if="returnedWork.length">
            <div v-for="item in returnedWork" :key="item.nodeId" class="form-panel">
              <NuxtLink :to="`/practicum/activities/${item.nodeId}`">
                <strong>{{ item.title }}</strong>
                <p class="meta">状态：已退回 · {{ item.feedback }}</p>
              </NuxtLink>
            </div>
          </div>
          <p v-else data-empty-returned class="empty-state">暂无待修改作业。</p>
        </section>

        <section data-rubric-results aria-labelledby="rubric-title">
          <h2 id="rubric-title" class="section-heading">量规结果</h2>
          <div v-if="rubricResults.length">
            <div v-for="result in rubricResults" :key="result.nodeId" class="form-panel">
              <h3>{{ result.activityTitle }}</h3>
              <table class="data-table" :aria-label="`${result.activityTitle} 量规结果`">
                <thead><tr><th>评分维度</th><th>得分</th><th>满分</th></tr></thead>
                <tbody>
                  <tr v-for="dim in result.dimensions" :key="dim.label">
                    <td>{{ dim.label }}</td><td>{{ dim.score }}</td><td>{{ dim.maxScore }}</td>
                  </tr>
                </tbody>
              </table>
              <p class="meta">总分：{{ result.totalScore }} / {{ result.maxTotal }} · 评语：{{ result.feedback }}</p>
            </div>
          </div>
          <p v-else data-empty-rubric class="empty-state">暂无已评分作业的量规结果。</p>
        </section>

        <section data-evidence-timeline aria-labelledby="timeline-title">
          <h2 id="timeline-title" class="section-heading">提交记录</h2>
          <div v-if="evidenceTimeline.length" class="timeline-list">
            <div v-for="item in evidenceTimeline" :key="item.nodeId + '-' + item.version" class="form-panel timeline-item">
              <p><strong>{{ item.title }}</strong></p>
              <p class="meta">版本 {{ item.version }} · {{ item.status }} · {{ item.submittedAt }}</p>
              <p v-if="item.feedback" class="meta">反馈：{{ item.feedback }}</p>
            </div>
          </div>
          <p v-else data-empty-timeline class="empty-state">暂无提交记录。</p>
        </section>
      </div>

      <!-- Owner view -->
      <div v-else-if="store.state.activeRole === 'OWNER'" data-owner-progress>
        <!-- Metrics overview -->
        <div class="metric-strip">
          <div class="metric">
            <span>班级完成率</span>
            <strong>{{ classCompletion.percent }}%</strong>
            <small>{{ classCompletion.completed }} / {{ classCompletion.total }} 人次</small>
          </div>
          <div class="metric">
            <span>待审核</span>
            <strong>{{ pendingReviewCount }}</strong>
            <small>份提交等待处理</small>
          </div>
          <div class="metric">
            <span>已提交</span>
            <strong>{{ statusDistribution.find(r => r.label === '已提交')?.count ?? 0 }}</strong>
            <small>学生已上交</small>
          </div>
          <div class="metric">
            <span>已评分</span>
            <strong>{{ statusDistribution.find(r => r.label === '已评分')?.count ?? 0 }}</strong>
            <small>已完成批阅</small>
          </div>
        </div>

        <!-- Two-column dashboard -->
        <div class="student-grid">
          <div class="main-column">
            <div class="panel">
              <div class="panel-head">
                <strong>班级完成趋势</strong>
                <NuxtLink v-if="pendingReviewCount > 0" to="/practicum/reviews" class="text-link compact-link">前往审核中心 →</NuxtLink>
              </div>
              <div class="progress-band" style="border:0;border-radius:0;margin:0">
                <div class="progress-track" role="progressbar" :aria-label="`班级完成 ${classCompletion.percent}%`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="classCompletion.percent">
                  <span :style="{ width: `${classCompletion.percent}%` }" />
                </div>
                <div class="progress-number">{{ classCompletion.percent }}%<small>{{ classCompletion.completed }} / {{ classCompletion.total }} 人次</small></div>
              </div>
            </div>

            <!-- Weak rubric dimensions -->
            <div class="panel">
              <div class="panel-head">
                <strong>薄弱量规维度</strong>
                <span>{{ weakRubricDimensions.length }} 项待关注</span>
              </div>
              <div v-if="weakRubricDimensions.length" class="table-wrap">
                <table aria-label="薄弱量规维度">
                  <thead><tr><th>评分维度</th><th>平均得分率</th><th>评分次数</th><th>所属活动</th></tr></thead>
                  <tbody>
                    <tr v-for="row in weakRubricDimensions" :key="row.label">
                      <td>{{ row.label }}</td>
                      <td>
                        <span :class="row.avgPercent < 50 ? 'status-pill-red' : 'status-pill-orange'" class="status-pill">{{ row.avgPercent }}%</span>
                      </td>
                      <td>{{ row.submissionCount }}</td>
                      <td>{{ row.activityTitle }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else data-empty-weak class="empty-state" style="border:0;margin:14px 16px">暂无评分数据可供分析。</p>
            </div>
          </div>

          <div class="side-column">
            <!-- Status distribution -->
            <div class="panel">
              <div class="panel-head">
                <strong>提交状态分布</strong>
              </div>
              <div v-if="statusDistribution.length" class="route-list">
                <div v-for="row in statusDistribution" :key="row.label" class="route-item">
                  <span class="route-number">{{ row.count }}</span>
                  <span class="route-copy">
                    <strong>{{ row.label }}</strong>
                    <span>当前状态</span>
                  </span>
                </div>
              </div>
              <p v-else data-empty class="empty-state" style="border:0;margin:14px 16px">暂无提交数据。</p>
            </div>

            <!-- Quick actions -->
            <div class="side-section">
              <h2>快捷操作</h2>
              <p v-if="pendingReviewCount > 0">有 {{ pendingReviewCount }} 份提交等待审核。前往审核中心处理学生作业。</p>
              <p v-else>暂无待处理事项。学生提交作业后这里会显示提醒。</p>
              <NuxtLink v-if="pendingReviewCount > 0" to="/practicum/reviews">
                <button type="button" class="primary-button" style="margin-top:10px;width:100%">进入审核中心</button>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { usePracticumStore, type GrowthDimension } from '../../composables/usePracticumStore'
import { canViewProgress } from '../../domain/practicum/permissions'

const store = usePracticumStore()
const isLoading = ref(true)
const loadError = ref(false)
const growthData = ref<{ dimensions: GrowthDimension[]; hasData: boolean }>({ dimensions: [], hasData: false })

const radarSize = 260
const radarCx = radarSize / 2
const radarCy = radarSize / 2
const radarR = 100
const gridColor = 'var(--practicum-border)'

const publishedPlan = computed(() => store.state.plans.find(p => p.status === 'PUBLISHED'))
const contextMeta = computed(() => {
  if (publishedPlan.value) return `${store.state.room.title} · ${publishedPlan.value.title}`
  return store.state.room.title
})

const growthDimensions = computed(() => growthData.value.dimensions)
const avgScore = computed(() => {
  if (!growthDimensions.value.length) return '--'
  const sum = growthDimensions.value.reduce((a: number, d: GrowthDimension) => a + d.score, 0)
  return Math.round(sum / growthDimensions.value.length)
})
const masteredCount = computed(() => growthDimensions.value.filter((d: GrowthDimension) => d.score >= 60).length)
const weakCount = computed(() => growthDimensions.value.filter((d: GrowthDimension) => d.score < 60).length)

function angle(i: number): number {
  return -Math.PI / 2 + (2 * Math.PI * i) / growthDimensions.value.length
}

const radarPoints = computed(() =>
  growthDimensions.value
    .map((dim: GrowthDimension, i: number) => {
      const dist = radarR * dim.score / dim.maxScore
      return `${radarCx + dist * Math.cos(angle(i))},${radarCy + dist * Math.sin(angle(i))}`
    })
    .join(' ')
)

const radarAriaLabel = computed(() => {
  if (!growthDimensions.value.length) return '六维能力雷达图：暂无数据'
  return `六维能力雷达图：${growthDimensions.value.map((d: GrowthDimension) => `${d.label} ${d.score}分`).join('，')}`
})

function loadGrowth() {
  isLoading.value = true
  loadError.value = false
  try {
    const result = store.getGrowthData('student-001')
    growthData.value = { dimensions: result.dimensions, hasData: result.hasData }
    isLoading.value = false
  } catch {
    loadError.value = true
    isLoading.value = false
  }
}

function retryLoad() {
  loadGrowth()
}

onMounted(() => {
  loadGrowth()
})

// Preserved existing computations
const planProgress = computed(() => {
  if (!publishedPlan.value) return { total: 0, completed: 0, percent: 0 }
  return store.getPlanProgress(publishedPlan.value.id)
})

const moduleList = computed(() => {
  if (!publishedPlan.value) return []
  return store.state.nodes.filter(n => n.planId === publishedPlan.value!.id && n.level === 1)
})

const moduleProgressMap = computed(() => {
  const map: Record<string, { total: number; completed: number; percent: number }> = {}
  for (const mod of moduleList.value) {
    map[mod.id] = store.getModuleProgress(mod.id)
  }
  return map
})

const unitProgressMap = computed(() => {
  const map: Record<string, { total: number; completed: number; percent: number }> = {}
  if (!publishedPlan.value) return map
  const units = store.state.nodes.filter(n => n.planId === publishedPlan.value!.id && n.level === 2)
  for (const unit of units) {
    const activities = store.state.nodes.filter(n => n.level === 3 && n.parentId === unit.id)
    const completed = activities.filter(n => store.isActivityComplete(n.id)).length
    map[unit.id] = { total: activities.length, completed, percent: activities.length ? Math.round((completed / activities.length) * 100) : 0 }
  }
  return map
})

function unitsForModule(moduleId: string) {
  return store.state.nodes.filter(n => n.parentId === moduleId && n.level === 2)
}

const returnedWork = computed(() => {
  const items: { nodeId: string; title: string; feedback: string }[] = []
  for (const [nodeId, submission] of Object.entries(store.state.practiceSubmissions)) {
    if (submission.status === 'RETURNED' && submission.studentId === 'student-001') {
      const node = store.state.nodes.find(n => n.id === nodeId)
      items.push({ nodeId, title: node?.title ?? '未知活动', feedback: submission.feedback ?? '无反馈' })
    }
  }
  return items
})

const evidenceTimeline = computed(() => {
  const items: { nodeId: string; title: string; version: number; status: string; submittedAt: string; feedback?: string }[] = []
  for (const [nodeId, submission] of Object.entries(store.state.practiceSubmissions)) {
    if (submission.studentId !== 'student-001') continue
    const node = store.state.nodes.find(n => n.id === nodeId)
    for (const version of submission.versions) {
      items.push({ nodeId, title: node?.title ?? '未知活动', version: version.version, status: submission.status, submittedAt: version.submittedAt, feedback: submission.feedback })
    }
  }
  return items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
})

const rubricResults = computed(() => store.getStudentRubricResults('student-001'))

// Owner computations
const allSubmissions = computed(() => Object.entries(store.state.practiceSubmissions))
const classCompletion = computed(() => {
  if (!publishedPlan.value) return { total: 0, completed: 0, percent: 0 }
  const activityCount = store.state.nodes.filter(n => n.planId === publishedPlan.value!.id && n.level === 3).length
  const memberCount = store.state.members.filter(m => m.role === 'STUDENT').length || 1
  const total = activityCount * memberCount
  let completed = 0
  for (const [, sub] of allSubmissions.value) { if (sub.status === 'GRADED') completed++ }
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 }
})
const pendingReviewCount = computed(() => allSubmissions.value.filter(([, sub]) => sub.status === 'SUBMITTED').length)
const statusDistribution = computed(() => {
  const counts: Record<string, number> = { SUBMITTED: 0, RETURNED: 0, GRADED: 0 }
  for (const [, sub] of allSubmissions.value) { counts[sub.status] = (counts[sub.status] || 0) + 1 }
  return [
    { label: '已提交', count: counts.SUBMITTED },
    { label: '已退回', count: counts.RETURNED },
    { label: '已评分', count: counts.GRADED },
  ]
})
const weakRubricDimensions = computed(() => store.getWeakRubricDimensions())
</script>

<style scoped>
/* Growth data styles — extends main.css tokens */
:root {
  --growth-accent: #2563eb;
}

.growth-overview-band {
  background: var(--practicum-surface);
  border: 1px solid var(--practicum-border);
  border-radius: var(--practicum-radius-sm);
  padding: 22px 24px;
  margin-bottom: 24px;
}
.growth-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.growth-title-row h2 {
  margin: 0;
  font-size: 17px;
}
.growth-meta {
  color: var(--practicum-muted);
  font-size: 13px;
}
.growth-radar-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  flex-wrap: wrap;
  padding: 12px 0;
}
.growth-quick-stats {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 120px;
}
.gqs-item {
  padding: 10px 14px;
  background: #fafbfc;
  border: 1px solid var(--practicum-border);
  border-radius: var(--practicum-radius-sm);
  text-align: center;
}
.gqs-value {
  display: block;
  font-size: 26px;
  font-weight: 800;
  color: var(--practicum-accent);
  line-height: 1.15;
  font-family: Bahnschrift, "Microsoft YaHei UI", sans-serif;
}
.gqs-value.mastered {
  color: var(--practicum-success);
}
.gqs-value.weak {
  color: var(--practicum-orange);
}
.gqs-label {
  display: block;
  margin-top: 4px;
  color: var(--practicum-muted);
  font-size: 12px;
}

.growth-dim-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 8px;
}
.growth-dim-card {
  background: var(--practicum-surface);
  border: 1px solid var(--practicum-border);
  border-radius: var(--practicum-radius-sm);
  padding: 16px;
}
.growth-dim-mastered {
  border-top: 3px solid var(--practicum-success);
}
.growth-dim-weak {
  border-top: 3px solid var(--practicum-orange);
}
.growth-dim-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.growth-dim-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--practicum-ink);
}
.growth-dim-score {
  font-size: 22px;
  font-weight: 800;
  font-family: Bahnschrift, "Microsoft YaHei UI", sans-serif;
}
.score-mastered { color: var(--practicum-success); }
.score-weak { color: var(--practicum-orange); }
.growth-dim-track {
  height: 6px;
  background: #eaecf0;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 8px;
}
.growth-dim-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--growth-accent);
  transition: width 0.4s ease-out;
}
.growth-dim-mastered .growth-dim-fill {
  background: var(--practicum-success);
}
.growth-dim-weak .growth-dim-fill {
  background: var(--practicum-orange);
}
.growth-dim-status {
  font-size: 12px;
  font-weight: 600;
  color: var(--practicum-muted);
}
.growth-dim-mastered .growth-dim-status {
  color: var(--practicum-success);
}
.growth-dim-weak .growth-dim-status {
  color: var(--practicum-orange);
}

/* meta helper */
.meta {
  color: var(--practicum-muted);
  font-size: 12px;
}
.unit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0 6px 14px;
  font-size: 13px;
  color: var(--practicum-ink-soft);
}
.unit-row + .unit-row {
  border-top: 1px solid var(--practicum-border);
}
.form-panel a {
  text-decoration: none;
  color: inherit;
}
.timeline-item {
  margin-bottom: 8px;
}
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}
.section-heading h2 {
  margin: 0;
  font-size: 17px;
}

@media (max-width: 900px) {
  .growth-dim-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .growth-dim-grid {
    grid-template-columns: 1fr;
  }
  .growth-radar-wrap {
    flex-direction: column;
    gap: 16px;
  }
  .growth-quick-stats {
    flex-direction: row;
    gap: 10px;
    min-width: auto;
  }
  .gqs-item {
    flex: 1;
  }
}
</style>
