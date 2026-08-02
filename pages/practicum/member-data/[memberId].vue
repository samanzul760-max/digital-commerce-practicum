<template>
  <ClientOnly>
    <PracticumShell context-title="成员数据" context-meta="学习进度与计划完成情况">
      <p v-if="isLoading" data-loading class="empty-state">正在加载成员数据...</p>
      <p v-else-if="!canAccessDataCenter(store.state.activeRole)" data-forbidden class="empty-state">只有管理员可以访问成员数据。</p>
      <p v-else-if="loadError" data-member-data-error class="empty-state" role="alert">成员数据加载失败，请刷新重试。</p>
      <section v-else-if="detail" data-member-data-page>
        <NuxtLink to="/practicum/data-center" class="text-link">返回数据中心</NuxtLink>
        <section class="page-heading">
          <div>
            <p class="eyebrow">成员数据</p>
            <h1 data-member-label>{{ detail.member.learnerLabel }}</h1>
            <p v-if="detail.member.groupLabel" data-member-group>{{ detail.member.groupLabel }} · {{ detail.member.isDemo ? '演示学生' : '正式学生' }}</p>
          </div>
        </section>
        <section class="metric-strip" aria-label="成员学习概览">
          <div class="metric"><span>完成率</span><strong data-member-completion>{{ detail.member.completionPercent }}%</strong></div>
          <div class="metric"><span>已评分活动</span><strong>{{ detail.member.gradedCount }}</strong></div>
          <div class="metric"><span>平均得分</span><strong>{{ detail.member.avgScore }}%</strong></div>
        </section>
        <section data-member-plan-breakdown>
          <h2>计划完成情况</h2>
          <div class="form-panel">
            <table class="data-table">
              <thead><tr><th>计划</th><th>已评分</th><th>活动数</th><th>完成率</th></tr></thead>
              <tbody>
                <tr v-for="plan in detail.plans" :key="plan.planId" data-member-plan-row>
                  <td>{{ plan.title }}</td><td>{{ plan.gradedCount }}</td><td>{{ plan.activityCount }}</td><td>{{ plan.completionPercent }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section data-member-skill-map>
          <h2>能力图谱</h2>
          <p v-if="!detail.skillMap.length" data-member-skill-map-empty class="empty-state">暂无已评分的实践活动，暂时无法生成能力图谱。</p>
          <div v-else class="form-panel">
            <table class="data-table">
              <thead><tr><th>能力维度</th><th>得分</th><th>掌握程度</th><th>说明</th></tr></thead>
              <tbody>
                <tr v-for="item in detail.skillMap" :key="item.skill" data-member-skill-row>
                  <td>{{ item.skill }}</td><td>{{ item.score }}%</td><td>{{ masteryLabel(item.mastery) }}</td><td>{{ item.explanation }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="detail.skillMap.length" class="analytics-explanations">
            <p data-member-strengths><strong>优势能力：</strong>{{ detail.strengths.length ? detail.strengths.map(item => item.skill).join('、') : '暂无达到熟练级别的能力维度' }}</p>
            <p data-member-improvements><strong>待提升能力：</strong>{{ detail.improvements.length ? detail.improvements.map(item => item.skill).join('、') : '暂无待提升的能力维度' }}</p>
          </div>
        </section>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usePracticumStore } from '../../../composables/usePracticumStore'
import { usePracticumServer, type PracticumMemberAnalyticsDetail } from '../../../composables/usePracticumServer'
import { canAccessDataCenter } from '../../../domain/practicum/permissions'

const route = useRoute()
const store = usePracticumStore()
const server = usePracticumServer()
const isLoading = ref(true)
const loadError = ref(false)
const detail = ref<PracticumMemberAnalyticsDetail | null>(null)

onMounted(async () => {
  try {
    detail.value = await server.getMemberAnalytics(String(route.params.memberId), 'room-001')
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
  }
})

function masteryLabel(mastery: 'MASTERED' | 'DEVELOPING' | 'NEEDS_SUPPORT') {
  return mastery === 'MASTERED' ? '已掌握' : mastery === 'DEVELOPING' ? '发展中' : '需加强'
}
</script>
