<template>
  <ClientOnly>
    <PracticumShell context-title="课程大厅" context-meta="按训练目标查找并进入实训课程">
      <section class="course-layout" data-course-hall data-opendesign-course-hall>
        <aside class="filters" aria-label="课程筛选">
          <div class="filter-title">课程分类</div>
          <label v-for="item in categories" :key="item" class="filter"><input v-model="category" type="radio" name="category" :value="item">{{ item }}</label>
          <div class="filter-title">学习难度</div>
          <label v-for="item in levels" :key="item" class="filter"><input v-model="level" type="radio" name="level" :value="item">{{ item }}</label>
          <div class="filter-title">课程类型</div>
          <label v-for="item in types" :key="item" class="filter"><input v-model="type" type="radio" name="type" :value="item">{{ item }}</label>
        </aside>

        <main class="course-main">
          <div class="section-head course-hall-heading">
            <div><h1>课程大厅</h1><p>从真实业务任务开始，完成你的第一份电商作品。</p></div>
            <button v-if="canCreate" type="button" class="blue-btn" @click="openCreateModal">新建计划</button>
          </div>
          <div class="course-tools">
            <input v-model.trim="query" data-course-search class="search" placeholder="搜索课程、技能或项目">
            <select v-model="sort" class="select" aria-label="课程排序"><option value="recommended">推荐排序</option><option value="name">课程名称</option></select>
          </div>
          <p class="result" aria-live="polite">显示 {{ filteredCourses.length }} 门课程</p>
          <div class="grid opendesign-course-grid">
            <article v-for="course in filteredCourses" :key="course.id" class="course-card" data-course-card role="link" tabindex="0" @click="openCourse(course)" @keydown.enter.prevent="openCourse(course)">
              <div class="course-banner" :class="course.color"><span class="cat">{{ course.category }}</span><h2>{{ course.title }}</h2></div>
              <div class="course-body"><b data-course-category>{{ course.category }}</b><span>{{ course.meta }}</span><div class="course-meta"><span class="stars" data-course-rating aria-label="五星课程">★★★★★</span><span class="tag" data-course-status>{{ course.type }}</span></div></div>
            </article>
            <p v-if="!filteredCourses.length" class="empty">没有找到匹配课程，请调整筛选条件。</p>
          </div>
        </main>
      </section>

      <Teleport to="body">
        <div v-if="createModalOpen" class="dashboard-modal-backdrop" role="presentation" @click.self="createModalOpen = false">
          <form class="dashboard-modal course-create-modal" role="dialog" aria-modal="true" aria-label="新建教学计划" @submit.prevent="createPlan">
            <h2>新建教学计划</h2><p>计划创建后将进入现有编辑流程，可继续配置课程、任务和发布范围。</p>
            <label>计划名称<input v-model.trim="planTitle" required maxlength="120"></label>
            <p v-if="modalMessage" role="status">{{ modalMessage }}</p>
            <div><button type="button" class="retry-button" @click="createModalOpen = false">取消</button><button class="blue-btn" :disabled="creating">{{ creating ? '创建中…' : '创建并编辑' }}</button></div>
          </form>
        </div>
      </Teleport>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthSession } from '~/composables/useAuthSession'
import { usePracticumServer } from '~/composables/usePracticumServer'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { canEditPlan } from '~/domain/practicum/permissions'
import { openDesignCourses, type OpenDesignCourse } from '~/data/practicum/opendesign-courses'

const auth = useAuthSession()
const server = usePracticumServer()
const store = usePracticumStore()
const query = ref('')
const category = ref('全部')
const level = ref('全部')
const type = ref('全部')
const sort = ref<'recommended' | 'name'>('recommended')
const createModalOpen = ref(false)
const planTitle = ref('')
const modalMessage = ref('')
const creating = ref(false)
const realPlans = ref<Array<{ id: string; title: string }>>([])

const categories = ['全部', '直播运营', '店铺增长', '数据分析']
const levels = ['全部', '入门', '进阶']
const types = ['全部', '免费', '实训计划']
const canCreate = computed(() => canEditPlan(store.state.activeRole))
const filteredCourses = computed(() => openDesignCourses.filter((course) =>
  (!query.value || `${course.title}${course.category}`.includes(query.value)) &&
  (category.value === '全部' || course.category === category.value) &&
  (level.value === '全部' || course.level === level.value) &&
  (type.value === '全部' || course.type === type.value),
).sort((a, b) => sort.value === 'name' ? a.title.localeCompare(b.title, 'zh-CN') : 0))

onMounted(async () => {
  const user = await auth.load()
  if (user) store.switchRole(user.role)
  try { realPlans.value = (await server.listPlans({ page: 1, pageSize: 50, status: 'PUBLISHED' })).items } catch { realPlans.value = [] }
})

function openCourse(course: OpenDesignCourse) {
  const matchedPlan = realPlans.value.find((plan) => plan.title === course.title)
  void navigateTo(matchedPlan ? `/practicum/learn/${matchedPlan.id}` : '/practicum/tasks')
}

function openCreateModal() { createModalOpen.value = true; modalMessage.value = '' }
async function createPlan() {
  if (!planTitle.value || creating.value) return
  creating.value = true
  modalMessage.value = ''
  try {
    const result = await $fetch<{ plan: { id: string } }>('/api/practicum/plans', { method: 'POST', headers: useCsrfHeaders({ 'Idempotency-Key': `opendesign-plan-${crypto.randomUUID()}` }), body: { roomId: store.state.room.id, title: planTitle.value, description: '由 LearnEC 课程大厅创建的教学计划。' } })
    await navigateTo(`/practicum/plans/${result.plan.id}/edit`)
  } catch { modalMessage.value = '暂时无法创建计划，请稍后重试。' } finally { creating.value = false }
}
</script>

<style scoped>
.course-hall-heading { margin-bottom: 24px; }
.course-hall-heading h1 { font-size: 28px; }
.course-card { cursor: pointer; }
.course-banner h2 { position: relative; z-index: 1; margin: 0; font-size: 20px; }
.course-create-modal { display: grid; gap: 14px; text-align: left; }
.course-create-modal label { display: grid; gap: 6px; color: var(--muted); font-size: 13px; }
.course-create-modal input { height: 42px; border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; font: inherit; }
.course-create-modal > div { display: flex; justify-content: flex-end; gap: 8px; }
</style>
