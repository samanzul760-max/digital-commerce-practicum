<template>
  <ClientOnly>
    <PracticumShell :context-title="plan?.title ?? '教学计划'" :context-meta="planMeta">
      <p v-if="isLoading" data-loading class="empty-state">正在加载计划详情...</p>

      <p v-else-if="!plan || loadError" data-empty class="empty-state">计划未找到或无权查看。</p>

      <div v-else data-plan-detail>
        <div class="plan-header">
          <div>
            <NuxtLink to="/practicum" data-back-link class="text-link">返回实训列表</NuxtLink>
            <h1>{{ plan?.title ?? '计划未找到' }}</h1>
          </div>
          <span v-if="plan" class="status-pill" :class="plan.status === 'DRAFT' ? 'status-pill-orange' : ''">
            {{ planStatusLabel }}
          </span>
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
import type { ActivityType, CurriculumNode, Plan } from '../../../../domain/practicum/types'

const route = useRoute()
const isLoading = ref(true)
const loadError = ref(false)
const planId = computed(() => route.params.planId as string)
type ServerPlan = Plan & { version: number }
interface PlanSnapshot {
  plan: ServerPlan
  nodes: CurriculumNode[]
}
const snapshot = ref<PlanSnapshot | null>(null)
const plan = computed(() => snapshot.value?.plan ?? null)
const planNodes = computed(() => snapshot.value?.nodes ?? [])
const modules = computed(() => planNodes.value.filter(node => node.level === 1).sort((a, b) => a.sort - b.sort))
const unitCount = computed(() => planNodes.value.filter(node => node.level === 2).length)
const activityCount = computed(() => planNodes.value.filter(node => node.level === 3).length)
const planStatusLabel = computed(() => plan.value?.status === 'PUBLISHED' ? '已发布' : plan.value?.status === 'ARCHIVED' ? '已归档' : '草稿')
const planMeta = computed(() => `${planStatusLabel.value} · ${modules.value.length} 模块 · ${unitCount.value} 单元 · ${activityCount.value} 活动`)
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

async function loadPlan() {
  isLoading.value = true
  loadError.value = false
  try {
    snapshot.value = await $fetch<PlanSnapshot>(`/api/practicum/plans/${encodeURIComponent(planId.value)}`, {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })
  } catch {
    snapshot.value = null
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

async function createNode(parentId: string | null, level: 1 | 2) {
  if (!plan.value || !newNodeTitle.value.trim()) return false
  try {
    const result = await $fetch<PlanSnapshot>(`/api/practicum/plans/${encodeURIComponent(plan.value.id)}/nodes`, {
      method: 'POST',
      headers: useCsrfHeaders({ 'Idempotency-Key': `plan-node-${Date.now()}` }),
      body: { parentId, level, title: newNodeTitle.value.trim(), version: plan.value.version },
    })
    snapshot.value = result
    return true
  } catch {
    loadError.value = true
    return false
  }
}

async function handleCreateModule() {
  if (!newNodeTitle.value.trim() || !plan.value) return
  if (!await createNode(null, 1)) return
  newNodeTitle.value = ''
  showModuleForm.value = false
}

function openCreateUnit(moduleId: string) {
  createUnitFor.value = moduleId
  newNodeTitle.value = ''
}

async function handleCreateUnit(moduleId: string) {
  if (!newNodeTitle.value.trim() || !plan.value) return
  if (!await createNode(moduleId, 2)) return
  newNodeTitle.value = ''
  createUnitFor.value = null
}

onMounted(loadPlan)
</script>
