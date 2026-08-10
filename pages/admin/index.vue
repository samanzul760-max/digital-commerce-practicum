<template>
  <LearnecAppShell role="ADMIN">
    <section data-admin-dashboard>
      <header class="paper"><h1>教学实训工作中心</h1><p class="calendar-note">围绕真实工单完成发、做、批、看的教学闭环。</p></header>
      <div class="admin-metrics"><NuxtLink class="metric-card orange" to="/admin/reviews"><span>批阅中心队列<MessageSquareText aria-hidden="true" /></span><strong>{{ analytics?.overview?.submittedCount ?? 0 }}</strong></NuxtLink><NuxtLink class="metric-card blue" to="/admin/tasks"><span>待下发工单<ClipboardList aria-hidden="true" /></span><strong>{{ draftCount }}</strong></NuxtLink><NuxtLink class="metric-card green" to="/admin/data"><span>班级完成率<ChartNoAxesCombined aria-hidden="true" /></span><strong>{{ analytics?.overview?.completionPercent ?? 0 }}%</strong></NuxtLink><NuxtLink class="metric-card purple" to="/admin/training-centers"><span>公共实训中心<Landmark aria-hidden="true" /></span><strong>{{ classes.length }}</strong></NuxtLink></div>
      <div class="admin-layout"><section class="paper"><div class="paper-head"><h3>近期实训任务</h3><NuxtLink to="/admin/tasks">管理工单</NuxtLink></div><p v-if="tasksPending" class="calendar-note">正在读取工单...</p><p v-else-if="!tasks.length" class="calendar-note">当前没有已创建的实训工单。</p><div v-else class="metric-list"><article v-for="task in tasks.slice(0,5)" :key="task.id"><strong>{{ task.title }}</strong><small>{{ task.status === 'PUBLISHED' ? '已发布' : '草稿，尚未下发给学生' }}</small></article></div></section><aside class="paper"><h3>班级学情</h3><label v-if="classes.length" class="calendar-note">选择班级<select v-model="selectedClassId"><option v-for="classroom in classes" :key="classroom.id" :value="classroom.id">{{ classroom.name }}</option></select></label><p v-else class="calendar-note">暂无可读取学情的授权班级。</p><p v-if="analyticsError" class="calendar-note" data-admin-analytics-error>{{ analyticsError }}</p><div v-if="analytics" class="metric-list"><article><strong>{{ analytics.overview.gradedCount }}</strong><small>已评分工单</small></article><article><strong>{{ analytics.overview.averageScore }}</strong><small>已评分平均分</small></article></div></aside></div>
    </section>
  </LearnecAppShell>
</template>

<script setup lang="ts">
import { ChartNoAxesCombined, ClipboardList, Landmark, MessageSquareText } from 'lucide-vue-next'
type Task = { id:string; title:string; status:string }
type Classroom = { id:string; name:string }
type Analytics = { overview: { submittedCount:number; completionPercent:number; gradedCount:number; averageScore:number } }
const { data: taskResponse, pending: tasksPending } = await useFetch<{ tasks: Task[] }>('/api/admin/tasks', { headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined })
const { data: classResponse } = await useFetch<{ classes: Classroom[] }>('/api/admin/classes', { headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined })
const tasks = computed(() => taskResponse.value?.tasks ?? [])
const classes = computed(() => classResponse.value?.classes ?? [])
const selectedClassId = ref('')
watch(classes, value => { if (!selectedClassId.value && value[0]) selectedClassId.value = value[0].id }, { immediate: true })
const analytics = ref<Analytics | null>(null)
const analyticsError = ref('')
const analyticsHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
async function loadAnalytics() {
  if (!selectedClassId.value) { analytics.value = null; return }
  analyticsError.value = ''
  try {
    analytics.value = await $fetch<Analytics>(`/api/admin/data?classId=${encodeURIComponent(selectedClassId.value)}`, { headers: analyticsHeaders })
  } catch {
    analytics.value = null
    analyticsError.value = '班级学情暂时无法读取，请稍后重试。'
  }
}
watch(selectedClassId, () => { void loadAnalytics() }, { immediate: true })
const draftCount = computed(() => tasks.value.filter(task => task.status !== 'PUBLISHED').length)
</script>
