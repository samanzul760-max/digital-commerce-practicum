<template>
  <ClientOnly>
    <PracticumShell :context-title="plan?.title ?? '教学计划'" :context-meta="planMeta">
      <p v-if="isLoading" data-loading class="empty-state">正在加载计划详情...</p>

      <div v-else-if="plan && !canViewPlan(store.state.activeRole, plan.status)" data-forbidden class="empty-state">
        该计划暂未发布，无法查看。
      </div>

      <div v-else data-plan-detail>
        <div class="plan-header">
          <div>
            <NuxtLink to="/practicum" data-back-link class="text-link">返回实训列表</NuxtLink>
            <h1>{{ plan?.title ?? '计划未找到' }}</h1>
          </div>
          <span v-if="plan" class="status-pill" :class="plan.status === 'DRAFT' ? 'status-pill-orange' : ''">
            {{ planStatusLabel }}
          </span>
          <NuxtLink v-if="canReview(store.state.activeRole) && planReview" data-plan-review-link :to="`/practicum/submissions/${planReview.submissionId}`" class="primary-button">打开计划审核</NuxtLink>
        </div>

        <div v-if="plan && plan.description === '内容待授权导入'" data-plan-pending class="empty-state">
          内容待授权导入
        </div>

        <div v-if="plan && plan.status === 'DRAFT'" class="section-heading">
          <h2>课程目录</h2>
          <button data-create-module class="primary-button" type="button" @click="showModuleForm = !showModuleForm">创建一级目录</button>
        </div>

        <form v-if="showModuleForm" data-create-form class="form-panel" @submit.prevent="handleCreateModule">
          <label class="field">目录名称<input data-node-title-input v-model="newNodeTitle" type="text" placeholder="输入目录名称"></label>
          <div class="form-actions">
            <button data-node-submit class="primary-button" type="submit">确认</button>
            <button class="secondary-button" type="button" @click="showModuleForm = false">取消</button>
          </div>
        </form>

        <div v-if="modules.length" data-module-list class="curriculum-list">
          <section v-for="mod in modules" :key="mod.id" data-module class="curriculum-module">
            <button data-module-toggle class="curriculum-toggle" type="button" :aria-expanded="isExpanded(mod.id)" @click="toggleExpand(mod.id)">
              <span>{{ mod.title }}</span><span aria-hidden="true">{{ isExpanded(mod.id) ? '−' : '+' }}</span>
            </button>
            <p class="curriculum-description">{{ mod.description }}</p>

            <div v-if="isExpanded(mod.id)" data-unit-list class="unit-list">
              <section v-for="unit in getChildren(mod.id, 2)" :key="unit.id" data-unit class="curriculum-unit">
                <button data-unit-toggle class="curriculum-toggle" type="button" :aria-expanded="isExpanded(unit.id)" @click="toggleExpand(unit.id)">
                  <span>{{ unit.title }}</span><span aria-hidden="true">{{ isExpanded(unit.id) ? '−' : '+' }}</span>
                </button>
                <div v-if="isExpanded(unit.id)" data-activity-list class="activity-list">
                  <div v-for="activity in getChildren(unit.id, 3)" :key="activity.id" data-activity :data-activity-type="activity.activityType" class="activity-row">
                    <span data-activity-icon class="activity-type">{{ activityTypeLabel(activity.activityType) }}</span>
                    <span>{{ activity.title }}</span>
                  </div>
                </div>
              </section>

              <button v-if="plan && plan.status === 'DRAFT'" data-create-unit class="secondary-button" type="button" @click="openCreateUnit(mod.id)">创建二级目录</button>
              <form v-if="createUnitFor === mod.id" data-create-form class="form-panel" @submit.prevent="handleCreateUnit(mod.id)">
                <label class="field">目录名称<input data-node-title-input v-model="newNodeTitle" type="text" placeholder="输入目录名称"></label>
                <div class="form-actions">
                  <button data-node-submit class="primary-button" type="submit">确认</button>
                  <button class="secondary-button" type="button" @click="createUnitFor = null">取消</button>
                </div>
              </form>
            </div>
          </section>
        </div>

        <p v-if="!modules.length && plan && plan.description !== '内容待授权导入'" data-empty class="empty-state">该计划暂无课程模块</p>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { ActivityType } from '../../../../domain/practicum/types'
import { usePracticumStore } from '../../../../composables/usePracticumStore'
import { canReview, canViewPlan } from '../../../../domain/practicum/permissions'

const route = useRoute()
const store = usePracticumStore()
const isLoading = ref(true)
onMounted(() => { isLoading.value = false })
const planId = computed(() => route.params.planId as string)
const plan = computed(() => store.state.plans.find(item => item.id === planId.value) ?? null)
const planNodes = computed(() => store.getPlanNodes(planId.value))
const modules = computed(() => planNodes.value.filter(node => node.level === 1).sort((a, b) => a.sort - b.sort))
const unitCount = computed(() => planNodes.value.filter(node => node.level === 2).length)
const activityCount = computed(() => planNodes.value.filter(node => node.level === 3).length)
const planStatusLabel = computed(() => plan.value?.status === 'PUBLISHED' ? '已发布' : plan.value?.status === 'ARCHIVED' ? '已归档' : '草稿')
const planMeta = computed(() => `${planStatusLabel.value} · ${modules.value.length} 模块 · ${unitCount.value} 单元 · ${activityCount.value} 活动`)
const planReview = computed(() => store.getReviewQueue().find(item => item.planId === planId.value && item.status === 'SUBMITTED') ?? null)
const expanded = ref<Set<string>>(new Set())
const showModuleForm = ref(false)
const createUnitFor = ref<string | null>(null)
const newNodeTitle = ref('')

function toggleExpand(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function isExpanded(id: string) {
  return expanded.value.has(id)
}

function getChildren(parentId: string, level: number) {
  return planNodes.value.filter(node => node.parentId === parentId && node.level === level).sort((a, b) => a.sort - b.sort)
}

function activityTypeLabel(type?: ActivityType) {
  if (type === 'SOFTWARE_ACTION') return '软件操作'
  if (type === 'TRAINING') return '训练活动'
  return '实践活动'
}

function handleCreateModule() {
  if (!newNodeTitle.value.trim() || !plan.value) return
  store.addNode({ planId: plan.value.id, parentId: null, level: 1, title: newNodeTitle.value.trim() })
  newNodeTitle.value = ''
  showModuleForm.value = false
}

function openCreateUnit(moduleId: string) {
  createUnitFor.value = moduleId
  newNodeTitle.value = ''
}

function handleCreateUnit(moduleId: string) {
  if (!newNodeTitle.value.trim() || !plan.value) return
  store.addNode({ planId: plan.value.id, parentId: moduleId, level: 2, title: newNodeTitle.value.trim() })
  newNodeTitle.value = ''
  createUnitFor.value = null
}
</script>
