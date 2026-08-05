<template>
  <ClientOnly>
    <PracticumShell :context-title="contextTitle" :context-meta="contextMeta">
      <div data-practicum class="home-workbench">
        <section v-if="isLoading" class="home-skeleton" aria-label="正在加载工作台">
          <i v-for="index in 6" :key="index" />
        </section>

        <PracticumStatePanel
          v-else-if="loadError"
          state="error"
          title="工作台数据加载失败"
          :description="loadError"
          action-label="重试"
          @action="loadOwnerPlans"
        />

        <PracticumStatePanel
          v-else-if="!store.state.activeRole"
          state="forbidden"
          title="请选择实训身份"
          description="选择学生、教师或管理员身份后，工作台会展示对应的任务与经营数据。"
        />

        <section v-else-if="store.state.activeRole === 'STUDENT'" data-student-home class="role-home">
          <header class="page-heading">
            <div><p class="eyebrow">今日运营</p><h1>学员经营工作台</h1><p>按优先级完成店铺运营任务，并观察实时经营指标。</p></div>
            <NuxtLink to="/practicum/shop/products" class="primary-button">进入模拟店铺</NuxtLink>
          </header>
          <section class="metric-grid" aria-label="模拟经营实时看板">
            <article><span>课程进度</span><b>{{ studentProgress.percent }}%</b><small>{{ studentProgress.completed }}/{{ studentProgress.total }} 项已完成</small></article>
            <article><span>待办任务</span><b>{{ studentTasks.length }}</b><small>按截止时间排序</small></article>
            <article><span>待修改</span><b>{{ returnedCount }}</b><small>根据教师反馈修改</small></article>
            <article><span>商品数</span><b>--</b><small>进入模拟店铺查看</small></article>
          </section>
          <section v-if="primaryPlan" class="current-plan-strip">
            <div><span>当前发布计划</span><strong>{{ primaryPlan.title }}</strong><small>{{ primaryPlan.description }}</small></div>
            <NuxtLink :to="`/practicum/learn/${primaryPlan.id}`" data-plan-link :data-plan-id="primaryPlan.id" data-course-card class="secondary-button">继续课程</NuxtLink>
          </section>
          <section class="table-panel">
            <div class="panel-heading"><div><h2>今日运营工作队列</h2><p>优先处理退回任务，再继续课程实操。</p></div><NuxtLink to="/practicum/tasks" class="text-link">全部任务</NuxtLink></div>
            <table v-if="studentTasks.length" class="data-table"><thead><tr><th>任务</th><th>类型</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="task in studentTasks" :key="task.id"><td>{{ task.title }}</td><td>课程实操</td><td>{{ task.status }}</td><td><NuxtLink :to="`/practicum/activities/${task.id}`" class="text-link">继续</NuxtLink></td></tr></tbody></table>
            <PracticumStatePanel v-else state="empty" title="今日任务已完成" description="可以进入模拟店铺继续完善商品和运费配置。" />
          </section>
        </section>

        <section v-else-if="store.state.activeRole === 'OWNER'" data-owner-home class="role-home">
          <header class="page-heading">
            <div><p class="eyebrow">运营总览</p><h1>管理员控制台</h1><p>跟踪教学计划、学员实操与待审核工作。</p></div>
            <button data-create-plan type="button" class="primary-button" @click="showCreateForm = !showCreateForm">新建教学计划</button>
          </header>

          <form v-if="showCreateForm" data-create-plan-form class="create-panel" @submit.prevent="handleCreatePlan">
            <label>计划名称<input v-model.trim="newPlanTitle" data-plan-title-input required maxlength="120"></label>
            <label>计划说明<textarea v-model.trim="newPlanDesc" data-plan-desc-input required maxlength="2000" rows="2" /></label>
            <div class="form-actions"><button type="button" class="secondary-button" @click="showCreateForm = false">取消</button><button data-plan-submit class="primary-button" type="submit" :disabled="isCreating">{{ isCreating ? '创建中...' : '创建计划' }}</button></div>
          </form>

          <section class="metric-grid" aria-label="运营数据概览">
            <article v-for="metric in ownerMetrics" :key="metric.label" data-admin-metric><span>{{ metric.label }}</span><b>{{ metric.value }}</b><small>{{ metric.detail }}</small></article>
          </section>

          <div class="owner-grid">
            <section class="table-panel" data-plan-list>
              <div class="panel-heading"><div><h2>教学计划</h2><p>所有计划均从服务端数据库读取。</p></div><NuxtLink to="/practicum/plans" class="text-link">全部计划</NuxtLink></div>
              <table v-if="visiblePlans.length" class="data-table"><thead><tr><th>计划</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody><tr v-for="plan in visiblePlans" :key="plan.id" data-plan-card><td><strong>{{ plan.title }}</strong><small>{{ plan.description || '暂无说明' }}</small></td><td>{{ planStatusLabel(plan.status) }}</td><td>{{ formatDate(plan.updatedAt) }}</td><td><NuxtLink :to="`/practicum/plans/${plan.id}/edit`" class="text-link">管理</NuxtLink></td></tr></tbody></table>
              <PracticumStatePanel v-else state="empty" title="暂无教学计划" description="创建第一个教学计划后即可配置课程目录。" />
            </section>
            <aside class="owner-side">
              <section data-review-summary class="side-panel"><div class="panel-heading"><div><h2>快速审核</h2><p>待处理的学员提交</p></div><b>{{ reviewQueueCount }}</b></div><NuxtLink to="/practicum/reviews" data-review-quick-link class="primary-button">进入审核中心</NuxtLink></section>
              <section data-activity-feed class="side-panel"><div class="panel-heading"><div><h2>最新实操动态</h2><p>最近提交记录</p></div></div><ul><li v-for="item in recentReviewActivity" :key="item.submissionId"><span>{{ item.studentLabel }}</span><small>{{ item.activityTitle }}</small></li></ul><p v-if="!recentReviewActivity.length" class="muted">暂无新的实操动态</p></section>
              <NuxtLink to="/practicum/achievements" data-achievements-home-entry class="side-panel side-link"><strong>学生完成情况</strong><small>查看班级排名与能力分布</small></NuxtLink>
            </aside>
          </div>
        </section>

        <section v-else data-teacher-home class="role-home">
          <header class="page-heading"><div><p class="eyebrow">教学工作区</p><h1>教师实训工作台</h1><p>查看课堂任务、教学案例与学员提交。</p></div><NuxtLink to="/practicum/classes" class="primary-button">进入我的班级</NuxtLink></header>
          <section class="metric-grid"><article><span>授权计划</span><b>{{ visiblePlans.length }}</b><small>当前实训室</small></article><article><span>待审核</span><b>{{ reviewQueueCount }}</b><small>学员提交</small></article></section>
          <section class="table-panel"><div class="panel-heading"><div><h2>教学任务队列</h2><p>集中处理课堂发布与作业审核。</p></div></div><div class="quick-actions"><NuxtLink to="/practicum/classes" class="secondary-button">课堂管理</NuxtLink><NuxtLink to="/practicum/reviews" class="secondary-button">审核队列</NuxtLink><NuxtLink to="/practicum/cases" class="secondary-button">教学案例</NuxtLink></div></section>
        </section>

        <div v-if="toastMessage" class="home-toast" role="status">{{ toastMessage }}</div>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCsrfHeaders } from '../../composables/useCsrfHeaders'
import { usePracticumStore } from '../../composables/usePracticumStore'
import type { Plan, PlanStatus } from '../../domain/practicum/types'

const store = usePracticumStore()
const isLoading = ref(true)
const loadError = ref('')
const serverPlans = ref<Plan[] | null>(null)
const showCreateForm = ref(false)
const newPlanTitle = ref('')
const newPlanDesc = ref('')
const isCreating = ref(false)
const toastMessage = ref('')

const visiblePlans = computed(() => serverPlans.value ?? store.visiblePlansFor(store.state.activeRole))
const primaryPlan = computed(() => visiblePlans.value.find(plan => plan.status === 'PUBLISHED') ?? visiblePlans.value[0] ?? null)
const studentProgress = computed(() => primaryPlan.value ? store.getPlanProgress(primaryPlan.value.id) : { completed: 0, total: 0, percent: 0 })
const studentTasks = computed(() => primaryPlan.value ? store.getPlanNodes(primaryPlan.value.id).filter(node => node.level === 3).slice(0, 8).map(node => ({ id: node.id, title: node.title, status: store.state.practiceSubmissions[node.id]?.status ?? '待完成' })) : [])
const returnedCount = computed(() => studentTasks.value.filter(task => task.status === 'RETURNED').length)
const publishedPlanCount = computed(() => visiblePlans.value.filter(plan => plan.status === 'PUBLISHED').length)
const reviewQueue = computed(() => store.getReviewQueue().filter(item => item.status === 'SUBMITTED'))
const reviewQueueCount = computed(() => reviewQueue.value.length)
const recentReviewActivity = computed(() => reviewQueue.value.slice(0, 4))
const activityCount = computed(() => store.state.activities.length)
const ownerMetrics = computed(() => [
  { label: '教学计划', value: visiblePlans.value.length, detail: `已发布 ${publishedPlanCount.value} 项` },
  { label: '待审核作业', value: reviewQueueCount.value, detail: '需要及时处理' },
  { label: '实操完成率', value: `${studentProgress.value.percent}%`, detail: '当前发布计划' },
  { label: '课程活动数', value: activityCount.value, detail: '实训与案例任务' },
])
const contextTitle = computed(() => store.state.activeRole === 'OWNER' ? '管理员控制台' : store.state.activeRole === 'STUDENT' ? '运营工作台' : '教师工作台')
const contextMeta = computed(() => store.state.activeRole === 'OWNER' ? '课程运营与实训审核' : store.state.activeRole === 'STUDENT' ? '今日任务与模拟经营' : '课堂任务与作业审核')

onMounted(loadOwnerPlans)

async function loadOwnerPlans() {
  isLoading.value = true
  loadError.value = ''
  try {
    if (store.state.activeRole === 'OWNER') {
      const response = await $fetch<{ items: Plan[] }>('/api/practicum/plans?page=1&pageSize=100&sort=updatedAt&direction=desc')
      serverPlans.value = response.items
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '无法连接工作台服务'
  } finally {
    isLoading.value = false
  }
}

async function handleCreatePlan() {
  if (!newPlanTitle.value || !newPlanDesc.value || isCreating.value) return
  isCreating.value = true
  try {
    const response = await $fetch<{ plan: Plan }>('/api/practicum/plans', {
      method: 'POST',
      headers: useCsrfHeaders({ 'Idempotency-Key': `home-plan-${Date.now()}` }),
      body: { roomId: store.state.room.id, title: newPlanTitle.value, description: newPlanDesc.value },
    })
    serverPlans.value = [response.plan, ...(serverPlans.value ?? [])]
    newPlanTitle.value = ''
    newPlanDesc.value = ''
    showCreateForm.value = false
    toastMessage.value = '教学计划已创建'
    window.setTimeout(() => { toastMessage.value = '' }, 2400)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '创建教学计划失败'
  } finally {
    isCreating.value = false
  }
}

function planStatusLabel(status: PlanStatus) {
  return status === 'PUBLISHED' ? '已发布' : status === 'ARCHIVED' ? '已归档' : '草稿'
}
function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('zh-CN').format(new Date(value)) : '--'
}
</script>

<style scoped>
.home-workbench{width:min(1280px,100%);margin:0 auto}.role-home{display:grid;gap:20px}.page-heading,.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.page-heading h1{margin:3px 0;font-size:28px;letter-spacing:0}.page-heading p,.panel-heading p{margin:3px 0;color:var(--practicum-muted)}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metric-grid article,.table-panel,.side-panel,.create-panel,.current-plan-strip{border:1px solid var(--practicum-border);border-radius:8px;background:#fff}.metric-grid article{display:grid;gap:7px;padding:18px}.metric-grid span,.metric-grid small{color:var(--practicum-muted);font-size:12px}.metric-grid b{font-size:26px}.current-plan-strip{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 18px}.current-plan-strip div{display:grid;gap:3px}.current-plan-strip span,.current-plan-strip small{color:var(--practicum-muted);font-size:12px}.owner-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px}.table-panel{overflow:hidden}.panel-heading{padding:16px 18px;border-bottom:1px solid var(--practicum-border)}.panel-heading h2{margin:0;font-size:17px}.data-table{width:100%;border-collapse:collapse}.data-table th,.data-table td{padding:12px 18px;border-bottom:1px solid var(--practicum-border);text-align:left;font-size:13px}.data-table th{color:var(--practicum-muted);background:#f8fafc;font-size:12px}.data-table td small{display:block;margin-top:3px;color:var(--practicum-muted)}.owner-side{display:grid;align-content:start;gap:16px}.side-panel{padding-bottom:16px}.side-panel>.primary-button{margin:16px}.side-panel ul{list-style:none;margin:0;padding:0 18px}.side-panel li{display:grid;gap:3px;padding:10px 0;border-bottom:1px solid var(--practicum-border)}.side-panel small,.muted{color:var(--practicum-muted)}.side-link{display:grid;gap:4px;padding:16px;color:var(--practicum-ink);text-decoration:none}.muted{padding:0 18px}.create-panel{display:grid;grid-template-columns:1fr 1.4fr auto;align-items:end;gap:12px;padding:16px}.create-panel label{display:grid;gap:6px;font-size:12px;font-weight:700}.create-panel input,.create-panel textarea{width:100%;padding:9px;border:1px solid var(--practicum-border);border-radius:6px}.quick-actions{display:flex;gap:10px;padding:18px}.home-skeleton{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.home-skeleton i{height:130px;border-radius:8px;background:linear-gradient(90deg,#edf1f5,#f8fafc,#edf1f5);background-size:200% 100%;animation:pulse 1.2s infinite}.home-toast{position:fixed;right:24px;bottom:24px;padding:12px 16px;border-radius:6px;background:#183153;color:#fff;box-shadow:0 8px 24px rgba(15,23,42,.2)}@keyframes pulse{to{background-position:-200% 0}}@media(max-width:980px){.metric-grid{grid-template-columns:repeat(2,1fr)}.owner-grid{grid-template-columns:1fr}.create-panel{grid-template-columns:1fr}}@media(max-width:560px){.page-heading,.current-plan-strip{align-items:flex-start;flex-direction:column}.metric-grid{grid-template-columns:1fr}.data-table{min-width:620px}.table-panel{overflow:auto}.quick-actions{flex-wrap:wrap}}
</style>
