<template>
  <LearnecAppShell role="STUDENT">
    <section data-center-dashboard>
      <div class="learnec-hero"><div class="learnec-hero-copy"><h1>把每一次实操，变成可见的成长。</h1><p>从教师下发的真实工单开始，在受控沙盘中完成证据留存、提交与反馈。</p><NuxtLink class="blue-btn" to="/center/assignments"><ClipboardList aria-hidden="true" />进入作业中心</NuxtLink></div><div class="hero-art"><GraduationCap aria-hidden="true" /></div></div>
      <div class="dash-welcome"><h2>{{ displayName }}，开始今天的实训</h2><p>当前有 {{ actionableCount }} 项需要你处理的工单，完成率 {{ completionRate }}%。</p><div class="medals"><span class="medal"><Award aria-hidden="true" /></span><span class="medal"><Medal aria-hidden="true" /></span></div></div>
      <div class="dashboard-grid"><section class="paper"><div class="paper-head"><h3>实训进度</h3><NuxtLink to="/center/assignments">查看全部</NuxtLink></div><p v-if="pending" class="calendar-note">正在读取实训工单...</p><p v-else-if="!assignments.length" class="calendar-note">当前没有已发布给你的实训工单。</p><div v-else><article v-for="assignment in assignments.slice(0,4)" :key="assignment.id" class="progress-row"><span class="task-glyph"><ClipboardCheck aria-hidden="true" /></span><div><strong>{{ assignment.title }}</strong><small>{{ statusLabel(assignment.status) }}</small><div class="track"><i :style="{ width: `${progressFor(assignment.status)}%` }" /></div></div><span>{{ progressFor(assignment.status) }}%</span></article></div></section><section class="paper" data-center-calendar><h3>学习日历</h3><div class="calendar"><b v-for="day in calendarDays" :key="day.key" :class="{ deadline: day.deadline }">{{ day.day }}</b></div><p class="calendar-note">{{ deadlineText }}</p></section></div>
    </section>
  </LearnecAppShell>
</template>

<script setup lang="ts">
import { Award, ClipboardCheck, ClipboardList, GraduationCap, Medal } from 'lucide-vue-next'
type Assignment = { id:string; title:string; status:string; dueAt:string|null }
const auth = useAuthSession()
const { data, pending } = await useFetch<{ assignments: Assignment[] }>('/api/center/assignments', { headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined })
const assignments = computed(() => data.value?.assignments ?? [])
const displayName = computed(() => auth.state.value.user?.displayName ?? '同学')
const actionableCount = computed(() => assignments.value.filter(item => ['AVAILABLE','IN_PROGRESS','RETURNED'].includes(item.status)).length)
const completionRate = computed(() => assignments.value.length ? Math.round(assignments.value.filter(item => item.status === 'GRADED').length / assignments.value.length * 100) : 0)
const dueDates = computed(() => assignments.value.map(item => item.dueAt ? new Date(item.dueAt) : null).filter((item): item is Date => item !== null && !Number.isNaN(item.getTime())))
const calendarDays = computed(() => Array.from({ length: 14 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() + index); const deadline = dueDates.value.some(item => item.toDateString() === date.toDateString()); return { key: date.toISOString().slice(0,10), day: date.getDate(), deadline } }))
const deadlineText = computed(() => dueDates.value.length ? `已标记 ${dueDates.value.length} 个真实工单截止日期。` : '暂未收到带截止时间的实训工单。')
function progressFor(status:string) { return ({ AVAILABLE:0, IN_PROGRESS:50, SUBMITTED:75, RETURNED:50, GRADED:100 } as Record<string,number>)[status] ?? 0 }
function statusLabel(status:string) { return ({ AVAILABLE:'待开始', IN_PROGRESS:'进行中', SUBMITTED:'待批阅', RETURNED:'需要修改', GRADED:'已完成' } as Record<string,string>)[status] ?? status }
</script>
