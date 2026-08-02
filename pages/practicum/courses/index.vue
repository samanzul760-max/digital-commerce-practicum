<template>
  <ClientOnly>
    <PracticumShell context-title="课程大厅" context-meta="按训练目标查找并进入实训课程">
      <PracticumStatePanel
        v-if="!store.state.activeRole"
        state="forbidden"
        title="请先选择身份"
        description="选择身份后，平台会展示你可访问的课程与操作。"
      />

      <section v-else class="view active" data-course-hall>
        <div class="course-layout">
          <aside class="filters" aria-label="课程筛选">
            <div class="filter-title">课程分类</div>
            <label class="filter"><input v-model="categories" type="checkbox" value="all">全部课程</label>
            <label class="filter"><input v-model="categories" type="checkbox" value="commerce">店铺运营</label>
            <label class="filter"><input v-model="categories" type="checkbox" value="marketing">营销增长</label>
            <label class="filter"><input v-model="categories" type="checkbox" value="data">数据分析</label>
            <br>
            <div class="filter-title">学习难度</div>
            <label class="filter"><input v-model="levels" type="checkbox" value="all">全部</label>
            <label class="filter"><input v-model="levels" type="checkbox" value="basic">入门</label>
            <label class="filter"><input v-model="levels" type="checkbox" value="advanced">进阶</label>
            <br>
            <div class="filter-title">课程类型</div>
            <label class="filter"><input v-model="statusFilters" type="checkbox" value="PUBLISHED">进行中</label>
            <label class="filter"><input v-model="statusFilters" type="checkbox" value="DRAFT">待发布</label>
            <label class="filter"><input v-model="statusFilters" type="checkbox" value="ARCHIVED">已归档</label>
          </aside>

          <main class="course-main">
            <div class="course-tools">
              <input v-model.trim="query" data-course-search class="search" placeholder="搜索课程、技能或项目">
              <select v-model="sort" class="select">
                <option value="updated">推荐排序</option>
                <option value="title">课程名称</option>
              </select>
              <select v-model="levelSelect" class="select">
                <option value="all">难度</option>
                <option value="basic">入门</option>
                <option value="advanced">进阶</option>
              </select>
              <button v-if="canEditPlan(store.state.activeRole)" data-create-plan type="button" class="blue-btn" @click="showCreateForm = !showCreateForm">新建课程</button>
              <button v-if="canEditPlan(store.state.activeRole)" data-bulk-publish type="button" class="blue-btn" :disabled="!selectedDraftIds.length" @click="publishSelected">批量发布（{{ selectedDraftIds.length }}）</button>
            </div>

            <form v-if="showCreateForm && canEditPlan(store.state.activeRole)" data-create-plan-form class="form-panel create-plan-panel" @submit.prevent="createDraftPlan">
              <div class="form-panel-heading"><strong>创建教学计划</strong><button type="button" class="text-link" @click="showCreateForm = false">取消</button></div>
              <label class="field">课程名称<input v-model.trim="createTitle" data-plan-title-input required maxlength="120"></label>
              <label class="field">课程简介<textarea v-model.trim="createDescription" data-plan-desc-input required maxlength="2000" rows="3"></textarea></label>
              <p v-if="createError" class="form-error" role="alert">{{ createError }}</p>
              <button data-plan-submit class="primary-button" type="submit" :disabled="createSaving">{{ createSaving ? '创建中…' : '创建草稿并编辑' }}</button>
            </form>

            <p v-if="bulkResult" data-bulk-result class="success-state">{{ bulkResult }}</p>

            <p v-if="serverLoading" data-backend-loading class="empty-state">正在从后端加载课程...</p>
            <p v-else-if="serverError" data-backend-fallback class="empty-state">后端课程暂时不可用，已显示本地演示课程。</p>

            <PracticumStatePanel
              v-if="!serverLoading && !filteredPlans.length"
              state="empty"
              title="没有匹配的课程"
              description="调整筛选条件，或等待教学管理员发布新的课程。"
            />
            <div v-else-if="filteredPlans.length" class="grid">
              <div v-for="plan in filteredPlans" :key="plan.id" class="course-card-wrap">
                <label v-if="canEditPlan(store.state.activeRole) && plan.status === 'DRAFT'" class="plan-select-label"><input v-model="selectedDraftIds" data-plan-select type="checkbox" :value="plan.id"><span>选择草稿</span></label>
                <PracticumCourseCard
                  :plan="plan"
                  :module-count="moduleCount(plan.id)"
                  :activity-count="activityCount(plan.id)"
                  :can-learn="canViewPlan(store.state.activeRole, plan.status) && store.state.activeRole === 'STUDENT'"
                  :can-manage="canEditPlan(store.state.activeRole)"
                />
              </div>
            </div>
          </main>
        </div>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { usePracticumServer } from '~/composables/usePracticumServer'
import { canEditPlan, canViewPlan } from '~/domain/practicum/permissions'
import type { Plan } from '~/domain/practicum/types'
import { catalogCourses } from '~/data/practicum/course-catalog'

const store = usePracticumStore()
const server = usePracticumServer()
const query = ref('')
const sort = ref<'updated' | 'title'>('updated')
const levelSelect = ref<'all' | 'basic' | 'advanced'>('all')
const categories = ref(['all'])
const levels = ref(['all'])
const statusFilters = ref(['PUBLISHED', 'DRAFT', 'ARCHIVED'])
const serverPlans = ref<Plan[] | null>(null)
const serverLoading = ref(false)
const serverError = ref(false)
const showCreateForm = ref(false)
const createTitle = ref('')
const createDescription = ref('')
const createSaving = ref(false)
const createError = ref('')
const selectedDraftIds = ref<string[]>([])
const bulkResult = ref('')

const plansSource = computed(() => {
  const primary = serverPlans.value?.length ? serverPlans.value : store.visiblePlansFor(store.state.activeRole)
  const ids = new Set(primary.map(plan => plan.id))
  return [...primary, ...catalogCourses.filter(plan => !ids.has(plan.id))]
})
const filteredPlans = computed(() => plansSource.value
  .filter(plan => canViewPlan(store.state.activeRole, plan.status))
  .filter(plan => !isShellCourse(plan))
  .filter(plan => store.state.activeRole !== 'STUDENT' || plan.status === 'PUBLISHED')
  .filter(plan => store.state.activeRole !== 'STUDENT' || hasLearnableContent(plan))
  .filter(plan => statusFilters.value.includes(plan.status))
  .filter(plan => categories.value.includes('all') || categories.value.includes(categoryFor(`${plan.title} ${plan.description ?? ''}`)))
  .filter(plan => {
    const level = levelFor(plan.id)
    return (levels.value.includes('all') || levels.value.includes(level)) && (levelSelect.value === 'all' || levelSelect.value === level)
  })
  .filter(plan => `${plan.title} ${plan.description ?? ''}`.toLowerCase().includes(query.value.toLowerCase()))
  .sort((a, b) => sort.value === 'title' ? a.title.localeCompare(b.title, 'zh-CN') : b.updatedAt.localeCompare(a.updatedAt)))

onMounted(() => {
  void loadPlansFromServer()
})

watch(() => store.state.activeRole, () => {
  void loadPlansFromServer()
})

async function loadPlansFromServer() {
  if (!store.state.activeRole) return
  serverLoading.value = true
  serverError.value = false
  try {
    const response = await server.listPlans({
      page: 1,
      pageSize: 50,
      status: store.state.activeRole === 'STUDENT' ? 'PUBLISHED' : undefined,
      sort: 'updatedAt',
      direction: 'desc',
    })
    serverPlans.value = response.items
  } catch {
    serverPlans.value = null
    serverError.value = true
  } finally {
    serverLoading.value = false
  }
}

function hasLearnableContent(plan: Plan) {
  const localModules = store.getPlanNodes(plan.id).some(node => node.level === 1)
  return localModules || (plan.moduleIds?.length ?? 0) > 0
}

/**
 * 检测空壳/测试课程。
 * 标题匹配 publish-数字 模式的临时测试课程对所有角色隐藏。
 * 对于学生，额外隐藏没有任何内容的课程（由 hasLearnableContent 处理）。
 */
function isShellCourse(plan: Plan): boolean {
  // 标题匹配 publish-数字 模式的临时测试课程
  if (/publish-\d+/i.test(plan.title)) return true
  // 标题为空或仅空白
  if (!plan.title?.trim()) return true
  return false
}

function moduleCount(planId: string) {
  const plan = plansSource.value.find(item => item.id === planId)
  return store.getPlanNodes(planId).filter(node => node.level === 1).length || plan?.moduleIds?.length || 0
}
function activityCount(planId: string) {
  const catalog = catalogCourses.find(item => item.id === planId)
  return store.getPlanNodes(planId).filter(node => node.level === 3).length || catalog?.taskCount || 0
}

async function createDraftPlan() {
  if (!createTitle.value || !createDescription.value || createSaving.value) return
  createSaving.value = true
  createError.value = ''
  try {
    const result = await $fetch<{ plan: Plan }>('/api/practicum/plans', {
      method: 'POST',
      headers: useCsrfHeaders({ 'Idempotency-Key': `plan-${crypto.randomUUID()}` }),
      body: { roomId: store.state.room.id, title: createTitle.value, description: createDescription.value },
    })
    await navigateTo(`/practicum/plans/${result.plan.id}/edit`)
  } catch {
    createError.value = '课程创建失败，请检查内容后重试。'
  } finally {
    createSaving.value = false
  }
}

async function publishSelected() {
  if (!selectedDraftIds.value.length) return
  bulkResult.value = ''
  try {
    const result = await $fetch<{ plans: Plan[] }>('/api/practicum/plans/batch-publish', {
      method: 'POST',
      headers: useCsrfHeaders({ 'Idempotency-Key': `batch-publish-${crypto.randomUUID()}` }),
      body: { planIds: selectedDraftIds.value },
    })
    const published = new Map(result.plans.map(plan => [plan.id, plan]))
    serverPlans.value = (serverPlans.value ?? []).map(plan => published.get(plan.id) ?? plan)
    selectedDraftIds.value = []
    bulkResult.value = `已发布 ${result.plans.length} 门课程。`
  } catch {
    bulkResult.value = '批量发布失败：请确认草稿内容完整后重试。'
  }
}
function categoryFor(text: string) {
  if (text.includes('数据')) return 'data'
  if (text.includes('营销') || text.includes('投放') || text.includes('增长')) return 'marketing'
  return 'commerce'
}
function levelFor(planId: string) {
  return planId.charCodeAt(0) % 2 ? 'basic' : 'advanced'
}
</script>

<style scoped>
.create-plan-panel { margin: 12px 0 16px; }
.form-panel-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.course-card-wrap { min-width: 0; }
.plan-select-label { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 6px 2px; color: var(--practicum-muted); font-size: 12px; }
.success-state { margin: 10px 0; color: #137333; }
</style>
