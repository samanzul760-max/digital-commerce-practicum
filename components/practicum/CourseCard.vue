<template>
  <article class="course-card" data-course-card>
    <div class="course-banner" :class="toneClass">
      {{ plan.title }}
    </div>
    <div class="course-body">
      <b>{{ category }}</b>
      <span>{{ moduleCount }} 节课程 · {{ activityCount }} 个实操项目</span>
      <div class="stars" aria-label="课程评分 5 星">★★★★★</div>
      <div class="course-card-actions">
        <NuxtLink :to="`/practicum/courses/${plan.id}`" class="text-link">查看课程</NuxtLink>
        <NuxtLink v-if="canLearn" :to="`/practicum/learn/${plan.id}`" class="blue-btn">进入学习</NuxtLink>
        <NuxtLink v-else-if="canManage" :to="`/practicum/plans/${plan.id}/edit`" class="blue-btn">管理课程</NuxtLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Plan } from '~/domain/practicum/types'

const props = defineProps<{
  plan: Plan
  moduleCount: number
  activityCount: number
  canLearn: boolean
  canManage: boolean
}>()

const toneClass = computed(() => {
  const tones = ['orange', 'blue', 'green', 'purple']
  return tones[Math.abs(props.plan.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % tones.length]
})
const category = computed(() => {
  const text = `${props.plan.title} ${props.plan.description ?? ''}`
  if (text.includes('数据')) return '经营分析'
  if (text.includes('直播')) return '直播运营'
  if (text.includes('营销') || text.includes('投放')) return '内容营销'
  return '店铺运营'
})
</script>

<style scoped>
.course-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}
</style>
