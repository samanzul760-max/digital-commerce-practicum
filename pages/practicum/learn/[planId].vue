<template>
  <ClientOnly>
    <PracticumShell :context-title="isPublishedStudentPlan ? plan?.title ?? '学习计划' : '学习计划不可访问'" :context-meta="isPublishedStudentPlan ? planMeta : ''">
      <p v-if="isLoading" data-loading class="empty-state">正在加载课程...</p>

      <!-- Block non-STUDENT or draft/unpublished plans -->
      <p v-else-if="!canAccessLearning(store.state.activeRole)" data-forbidden class="empty-state">请使用学生身份访问学习内容。</p>

      <div v-else-if="plan && !canViewPlan(store.state.activeRole, plan.status)" data-forbidden class="empty-state">
        该计划暂未发布，无法学习。
      </div>

      <div v-else-if="plan" data-learn-plan>
        <div class="plan-header">
          <div>
            <NuxtLink to="/practicum" data-back-link class="text-link">返回学习首页</NuxtLink>
            <p class="eyebrow">课程学习</p>
            <h1>{{ plan.title }}</h1>
          </div>
          <span class="status-pill">已发布</span>
        </div>

        <div class="progress-band">
          <div>
            <h2>学习进度</h2>
            <div class="progress-track" role="progressbar" :aria-label="`完成 ${progressPercent}%`" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
              <span :style="{ width: progressPercent + '%' }" />
            </div>
          </div>
          <div class="progress-number">{{ progressPercent }}%<small>{{ completedCount }} / {{ totalActivityCount }} 活动</small></div>
        </div>

        <div class="section-heading">
          <h2>课程目录</h2>
        </div>

        <div v-if="modules.length" data-module-list class="curriculum-list">
          <section v-for="mod in modules" :key="mod.id" data-module class="curriculum-module">
            <button data-module-toggle class="curriculum-toggle" type="button" :aria-expanded="isExpanded(mod.id)" @click="toggleExpand(mod.id)">
              <span>{{ mod.title }}</span><span aria-hidden="true">{{ isExpanded(mod.id) ? '−' : '+' }}</span>
            </button>

            <div v-if="isExpanded(mod.id)" data-unit-list class="unit-list">
              <section v-for="unit in getChildren(mod.id, 2)" :key="unit.id" data-unit class="curriculum-unit">
                <button data-unit-toggle class="curriculum-toggle" type="button" :aria-expanded="isExpanded(unit.id)" @click="toggleExpand(unit.id)">
                  <span>{{ unit.title }}</span><span aria-hidden="true">{{ isExpanded(unit.id) ? '−' : '+' }}</span>
                </button>
                <div v-if="isExpanded(unit.id)" data-activity-list class="activity-list">
                  <NuxtLink
                    v-for="activity in getChildren(unit.id, 3)"
                    :key="activity.id"
                    :to="`/practicum/activities/${activity.id}`"
                    data-activity
                    :data-activity-type="activity.activityType"
                    class="activity-row"
                    :class="{ 'activity-current': learningPosition === activity.id }"
                    :data-current-activity="learningPosition === activity.id ? '' : undefined"
                    @click="store.setLearningPosition(plan.id, activity.id)"
                  >
                    <span data-activity-icon class="activity-type">{{ activityTypeLabel(activity.activityType) }}</span>
                    <span>{{ activity.title }}</span>
                    <span v-if="learningPosition === activity.id" class="status-pill" style="margin-left:auto;">上次位置</span>
                  </NuxtLink>
                </div>
              </section>
            </div>
          </section>
        </div>

        <p v-else data-empty class="empty-state">该计划暂无课程模块</p>
      </div>

      <p v-else data-empty class="empty-state">计划未找到</p>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { ActivityType } from '~/domain/practicum/types'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { canAccessLearning, canViewPlan } from '~/domain/practicum/permissions'

const route = useRoute()
const store = usePracticumStore()
const isLoading = ref(true)
onMounted(() => { isLoading.value = false })
const planId = computed(() => route.params.planId as string)
const plan = computed(() => store.state.plans.find(p => p.id === planId.value) ?? null)
const isPublishedStudentPlan = computed(() => store.state.activeRole === 'STUDENT' && plan.value?.status === 'PUBLISHED')
const planNodes = computed(() => store.getPlanNodes(planId.value))
const modules = computed(() => planNodes.value.filter(n => n.level === 1).sort((a, b) => a.sort - b.sort))
const unitCount = computed(() => planNodes.value.filter(n => n.level === 2).length)
const totalActivityCount = computed(() => planNodes.value.filter(n => n.level === 3).length)
const progress = computed(() => store.getPlanProgress(planId.value))
const completedCount = computed(() => progress.value.completed)
const progressPercent = computed(() => progress.value.percent)

// Learning position: restore last position or default to first activity
const learningPosition = computed(() => {
  const saved = store.getLearningPosition(planId.value)
  if (saved) return saved
  const first = planNodes.value.filter(n => n.level === 3).sort((a, b) => a.sort - b.sort)[0]
  return first?.id ?? null
})

const planMeta = computed(() => `已发布 · ${modules.value.length} 模块 · ${unitCount.value} 单元 · ${totalActivityCount.value} 活动`)
const expanded = ref<Set<string>>(new Set())

function toggleExpand(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function isExpanded(id: string) { return expanded.value.has(id) }

function getChildren(parentId: string, level: number) {
  return planNodes.value.filter(n => n.parentId === parentId && n.level === level).sort((a, b) => a.sort - b.sort)
}

function activityTypeLabel(type?: ActivityType) {
  if (type === 'SOFTWARE_ACTION') return '软件操作'
  if (type === 'TRAINING') return '训练活动'
  return '实践活动'
}
</script>
