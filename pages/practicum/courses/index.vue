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
              <NuxtLink v-if="canEditPlan(store.state.activeRole)" to="/practicum#plans" class="blue-btn">新建课程</NuxtLink>
            </div>

            <p v-if="serverLoading" data-backend-loading class="empty-state">正在从后端加载课程...</p>
            <p v-else-if="serverError" data-backend-fallback class="empty-state">后端课程暂时不可用，已显示本地演示课程。</p>

            <PracticumStatePanel
              v-if="!serverLoading && !filteredPlans.length"
              state="empty"
              title="没有匹配的课程"
              description="调整筛选条件，或等待教学管理员发布新的课程。"
            />
            <div v-else-if="filteredPlans.length" class="grid">
              <PracticumCourseCard
                v-for="plan in filteredPlans"
                :key="plan.id"
                :plan="plan"
                :module-count="moduleCount(plan.id)"
                :activity-count="activityCount(plan.id)"
                :can-learn="canViewPlan(store.state.activeRole, plan.status) && store.state.activeRole === 'STUDENT'"
                :can-manage="canEditPlan(store.state.activeRole)"
              />
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

const plansSource = computed(() => serverPlans.value ?? store.visiblePlansFor(store.state.activeRole))
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
  return store.getPlanNodes(planId).filter(node => node.level === 3).length
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
