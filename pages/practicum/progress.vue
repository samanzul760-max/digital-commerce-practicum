<template>
  <ClientOnly>
    <PracticumShell context-title="学习进度" context-meta="网店运营">
      <!-- Loading -->
      <p v-if="isLoading" data-loading class="empty-state">正在加载进度数据...</p>

      <!-- Forbidden for non-authorized roles -->
      <p v-else-if="!canViewProgress(store.state.activeRole)" data-forbidden class="empty-state">你没有访问进度页面的权限。</p>

      <!-- Student view -->
      <div v-else-if="store.state.activeRole === 'STUDENT'" data-student-progress>
        <!-- Overall plan progress -->
        <section data-overall-progress class="progress-band" aria-labelledby="overall-title">
          <h2 id="overall-title">总体进度</h2>
          <div class="progress-track" role="progressbar" :aria-label="`计划完成进度 ${planProgress.percent}%`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="planProgress.percent">
            <span :style="{ width: `${planProgress.percent}%` }" />
          </div>
          <div class="progress-number">{{ planProgress.percent }}%<small>{{ planProgress.completed }} / {{ planProgress.total }} 活动</small></div>
        </section>

        <!-- Module progress -->
        <section data-module-progress aria-labelledby="modules-title">
          <h2 id="modules-title">模块进度</h2>
          <div v-for="mod in moduleList" :key="mod.id" class="form-panel">
            <h3>{{ mod.title }}</h3>
            <div class="progress-track" role="progressbar" :aria-label="`${mod.title} ${moduleProgressMap[mod.id]?.percent ?? 0}%`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="moduleProgressMap[mod.id]?.percent ?? 0">
              <span :style="{ width: `${moduleProgressMap[mod.id]?.percent ?? 0}%` }" />
            </div>
            <p class="meta">{{ moduleProgressMap[mod.id]?.completed ?? 0 }} / {{ moduleProgressMap[mod.id]?.total ?? 0 }} 活动</p>
            <!-- Unit progress within module -->
            <div v-for="unit in unitsForModule(mod.id)" :key="unit.id" class="unit-row">
              <span>{{ unit.title }}</span>
              <span class="meta">{{ unitProgressMap[unit.id]?.completed ?? 0 }} / {{ unitProgressMap[unit.id]?.total ?? 0 }}</span>
            </div>
          </div>
          <p v-if="!moduleList.length" data-empty class="empty-state">暂无已发布的教学模块。</p>
        </section>

        <!-- Returned work -->
        <section data-returned-work aria-labelledby="returned-title">
          <h2 id="returned-title">待修改作业</h2>
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

        <!-- Rubric results -->
        <section data-rubric-results aria-labelledby="rubric-title">
          <h2 id="rubric-title">量规结果</h2>
          <div v-if="rubricResults.length">
            <div v-for="result in rubricResults" :key="result.nodeId" class="form-panel">
              <h3>{{ result.activityTitle }}</h3>
              <table class="data-table" :aria-label="`${result.activityTitle} 量规结果`">
                <thead>
                  <tr><th>评分维度</th><th>得分</th><th>满分</th></tr>
                </thead>
                <tbody>
                  <tr v-for="dim in result.dimensions" :key="dim.label">
                    <td>{{ dim.label }}</td>
                    <td>{{ dim.score }}</td>
                    <td>{{ dim.maxScore }}</td>
                  </tr>
                </tbody>
              </table>
              <p class="meta">总分：{{ result.totalScore }} / {{ result.maxTotal }} · 评语：{{ result.feedback }}</p>
            </div>
          </div>
          <p v-else data-empty-rubric class="empty-state">暂无已评分作业的量规结果。</p>
        </section>

        <!-- Evidence timeline -->
        <section data-evidence-timeline aria-labelledby="timeline-title">
          <h2 id="timeline-title">提交记录</h2>
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
        <!-- Class completion -->
        <section data-class-completion class="progress-band" aria-labelledby="class-comp-title">
          <h2 id="class-comp-title">班级完成情况</h2>
          <div class="progress-track" role="progressbar" :aria-label="`班级完成 ${classCompletion.percent}%`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="classCompletion.percent">
            <span :style="{ width: `${classCompletion.percent}%` }" />
          </div>
          <div class="progress-number">{{ classCompletion.percent }}%<small>{{ classCompletion.completed }} / {{ classCompletion.total }} 人次</small></div>
        </section>

        <!-- Pending reviews -->
        <section data-pending-reviews aria-labelledby="pending-title">
          <h2 id="pending-title">待审核</h2>
          <div class="form-panel">
            <p><strong>{{ pendingReviewCount }}</strong> 份提交待审核</p>
            <NuxtLink v-if="pendingReviewCount > 0" to="/practicum/reviews" class="text-link">前往审核中心</NuxtLink>
          </div>
        </section>

        <!-- Status distribution -->
        <section data-status-distribution aria-labelledby="dist-title">
          <h2 id="dist-title">提交状态分布</h2>
          <div class="form-panel">
            <table class="data-table" aria-label="提交状态分布">
              <thead>
                <tr><th>状态</th><th>数量</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in statusDistribution" :key="row.label">
                  <td>{{ row.label }}</td>
                  <td>{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!statusDistribution.length" data-empty class="empty-state">暂无提交数据。</p>
        </section>

        <!-- Weak rubric dimensions -->
        <section data-weak-rubric aria-labelledby="weak-title">
          <h2 id="weak-title">薄弱量规维度</h2>
          <div v-if="weakRubricDimensions.length" class="form-panel">
            <table class="data-table" aria-label="薄弱量规维度">
              <thead>
                <tr><th>评分维度</th><th>平均得分率</th><th>评分次数</th><th>所属活动</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in weakRubricDimensions" :key="row.label">
                  <td>{{ row.label }}</td>
                  <td>{{ row.avgPercent }}%</td>
                  <td>{{ row.submissionCount }}</td>
                  <td>{{ row.activityTitle }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else data-empty-weak class="empty-state">暂无评分数据可供分析。</p>
        </section>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { usePracticumStore } from '../../composables/usePracticumStore'
import { canViewProgress } from '../../domain/practicum/permissions'

const store = usePracticumStore()
const isLoading = ref(true)

onMounted(() => {
  isLoading.value = false
})

const publishedPlan = computed(() => store.state.plans.find(p => p.status === 'PUBLISHED'))

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
      items.push({
        nodeId,
        title: node?.title ?? '未知活动',
        feedback: submission.feedback ?? '无反馈',
      })
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
      items.push({
        nodeId,
        title: node?.title ?? '未知活动',
        version: version.version,
        status: submission.status,
        submittedAt: version.submittedAt,
        feedback: submission.feedback,
      })
    }
  }
  return items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
})

const rubricResults = computed(() => store.getStudentRubricResults('student-001'))

// -- Teacher view computations --

const allSubmissions = computed(() => Object.entries(store.state.practiceSubmissions))

const classCompletion = computed(() => {
  if (!publishedPlan.value) return { total: 0, completed: 0, percent: 0 }
  const activityCount = store.state.nodes.filter(n => n.planId === publishedPlan.value!.id && n.level === 3).length
  const memberCount = store.state.members.filter(m => m.role === 'STUDENT').length || 1
  const total = activityCount * memberCount
  let completed = 0
  for (const [, sub] of allSubmissions.value) {
    if (sub.status === 'GRADED') completed++
  }
  return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 }
})

const pendingReviewCount = computed(() => {
  return allSubmissions.value.filter(([, sub]) => sub.status === 'SUBMITTED').length
})

const statusDistribution = computed(() => {
  const counts: Record<string, number> = { SUBMITTED: 0, RETURNED: 0, GRADED: 0 }
  for (const [, sub] of allSubmissions.value) {
    counts[sub.status] = (counts[sub.status] || 0) + 1
  }
  return [
    { label: '已提交', count: counts.SUBMITTED },
    { label: '已退回', count: counts.RETURNED },
    { label: '已评分', count: counts.GRADED },
  ]
})

const weakRubricDimensions = computed(() => store.getWeakRubricDimensions())
</script>
