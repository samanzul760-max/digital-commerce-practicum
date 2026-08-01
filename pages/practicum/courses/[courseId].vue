<template>
  <ClientOnly>
    <PracticumShell :context-title="plan?.title ?? '课程详情'" context-meta="课程介绍、训练结构与学习入口">
      <PracticumStatePanel v-if="!plan" state="empty" title="课程未找到" description="该课程可能已被归档，或当前账号没有访问权限。" />
      <PracticumStatePanel v-else-if="!canViewPlan(store.state.activeRole, plan.status)" state="forbidden" title="暂时无法访问课程" description="学生仅能进入已发布课程；请联系教学管理员确认发布状态。" />
      <section v-else class="course-detail" data-course-detail>
        <NuxtLink to="/practicum/courses" class="back-link">返回课程大厅</NuxtLink>
        <header class="course-detail-hero"><div><p class="eyebrow">{{ plan.status === 'PUBLISHED' ? '进行中课程' : '课程计划' }}</p><h1>{{ plan.title }}</h1><p>{{ plan.description || '该课程将用真实业务任务串联学习、实操、提交和反馈。' }}</p></div><NuxtLink v-if="store.state.activeRole === 'STUDENT'" :to="catalog ? '/practicum/tasks' : `/practicum/learn/${plan.id}`" class="primary-button">查看实操任务</NuxtLink><NuxtLink v-else-if="canEditPlan(store.state.activeRole)" :to="`/practicum/plans/${plan.id}/edit`" class="primary-button">管理课程</NuxtLink></header>
        <div class="course-detail-grid"><section class="outline-panel"><div class="panel-head"><h2>课程大纲</h2><span>{{ modules.length }} 个模块</span></div><ol><li v-for="module in modules" :key="module.id"><strong>{{ module.title }}</strong><span>{{ unitsFor(module.id) }} 个单元 · {{ activitiesFor(module.id) }} 个任务</span></li></ol></section><aside class="course-detail-side"><section><span>训练任务</span><b>{{ activities.length }}</b><p>完成课程中的资料阅读、实操任务与作业提交。</p></section><section><span>课程状态</span><b>{{ plan.status === 'PUBLISHED' ? '已发布' : '待发布' }}</b><p>课程进度和教师反馈会保存在个人学习记录中。</p></section></aside></div>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { usePracticumServer, type PlanDetailResponse } from '~/composables/usePracticumServer'
import { canEditPlan, canViewPlan } from '~/domain/practicum/permissions'
import { catalogCourses } from '~/data/practicum/course-catalog'

const route = useRoute()
const store = usePracticumStore()
const server = usePracticumServer()
const backendDetail = ref<PlanDetailResponse | null>(null)
const catalog = computed(() => catalogCourses.find(item => item.id === route.params.courseId))
const plan = computed(() => backendDetail.value?.plan ?? store.state.plans.find(item => item.id === route.params.courseId) ?? catalog.value)
const detailNodes = computed(() => {
  const nodes = backendDetail.value?.nodes ?? (plan.value ? store.getPlanNodes(plan.value.id) : [])
  if (nodes.length || !catalog.value) return nodes
  return [{ id: `${catalog.value.id}-module`, planId: catalog.value.id, parentId: null, level: 1 as const, title: `${catalog.value.category}核心训练`, description: '', sort: 1 }]
})
const modules = computed(() => detailNodes.value.filter(node => node.level === 1).sort((a, b) => a.sort - b.sort))
const activities = computed(() => detailNodes.value.filter(node => node.level === 3))

onMounted(() => {
  void loadCourseDetail()
})

watch(() => route.params.courseId, () => {
  void loadCourseDetail()
})

async function loadCourseDetail() {
  try {
    backendDetail.value = await server.getPlan(String(route.params.courseId))
  } catch {
    backendDetail.value = null
  }
}

function unitsFor(moduleId: string) { return detailNodes.value.filter(node => node.parentId === moduleId && node.level === 2).length }
function activitiesFor(moduleId: string) { const unitIds = detailNodes.value.filter(node => node.parentId === moduleId && node.level === 2).map(node => node.id); return detailNodes.value.filter(node => unitIds.includes(node.parentId ?? '') && node.level === 3).length }
</script>

<style scoped>
.course-detail{display:grid;gap:18px;max-width:1120px;margin:0 auto}.back-link{color:var(--practicum-muted);font-size:13px;text-decoration:none}.back-link:hover{color:var(--practicum-accent)}.course-detail-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding-bottom:24px;border-bottom:1px solid var(--practicum-border)}.course-detail-hero h1{margin:4px 0 8px;font-size:30px}.course-detail-hero p:not(.eyebrow){max-width:650px;margin:0;color:var(--practicum-muted)}.course-detail-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:18px}.outline-panel,.course-detail-side section{background:#fff;border:1px solid var(--practicum-border);border-radius:var(--practicum-radius-sm)}.panel-head{display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid var(--practicum-border)}.panel-head h2{margin:0;font-size:17px}.panel-head span,.outline-panel li span,.course-detail-side span,.course-detail-side p{color:var(--practicum-muted);font-size:13px}.outline-panel ol{margin:0;padding:0 16px;list-style:none}.outline-panel li{display:grid;gap:4px;padding:14px 0;border-bottom:1px solid var(--practicum-border)}.outline-panel li:last-child{border-bottom:0}.course-detail-side{display:grid;gap:12px}.course-detail-side section{display:grid;gap:6px;padding:16px}.course-detail-side b{font-size:22px}.course-detail-side p{margin:0}@media(max-width:720px){.course-detail-hero{align-items:flex-start;flex-direction:column}.course-detail-grid{grid-template-columns:1fr}}
</style>
