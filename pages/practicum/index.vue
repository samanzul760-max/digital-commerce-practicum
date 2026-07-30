<template>
  <ClientOnly>
    <PracticumShell :context-title="contextTitle" :context-meta="contextMeta">
      <div data-practicum class="practicum-home">
        <p v-if="isLoading" class="empty-state">正在加载实训工作台…</p>

        <section v-else-if="!store.state.activeRole" class="role-entry">
          <p class="eyebrow">DIGITAL COMMERCE PRACTICUM</p>
          <h1>选择身份后开始实战</h1>
          <p>平台会按你的权限提供学员学习或管理员运营入口。</p>
          <NuxtLink to="/practicum/profile" class="primary-button">选择身份</NuxtLink>
        </section>

        <section v-else-if="store.state.activeRole === 'STUDENT'" data-student-home class="student-home">
          <header class="student-welcome">
            <div>
              <p class="eyebrow">我的实战进度</p>
              <h1>欢迎回来，学员！</h1>
              <p>继续保持节奏，你距离本阶段实战目标只差最后一步。</p>
              <div class="student-facts"><span><b>12 天</b>连续打卡</span><span><b>46.5h</b>累计学习时长</span></div>
            </div>
            <div class="overall-progress">
              <span>整体实操完成度</span><b>{{ studentProgress.percent }}%</b>
              <div class="progress-track"><i :style="{ width: studentProgress.percent + '%' }" /></div>
              <small>{{ studentProgress.completed }} / {{ studentProgress.total }} 个必修活动已完成</small>
            </div>
          </header>

          <div class="student-layout">
            <section v-if="primaryPlan" class="learning-card">
              <div class="card-lead"><span>当前实操课程</span><h2>{{ primaryPlan.title }}</h2><p>{{ primaryPlan.description || '跟随课程完成店铺、商品、数据分析和投放实训。' }}</p></div>
              <div class="milestone-line" aria-label="学习里程碑">
                <div v-for="(module, index) in modules.slice(0, 4)" :key="module.id" :class="['milestone', { done: store.getModuleProgress(module.id).percent >= 100, active: store.getModuleProgress(module.id).percent > 0 && store.getModuleProgress(module.id).percent < 100 }]">
                  <i>{{ index + 1 }}</i><b>{{ module.title }}</b><small>{{ store.getModuleProgress(module.id).percent }}% 已完成</small>
                </div>
              </div>
              <div class="learning-actions"><NuxtLink v-if="nextActivity" :to="`/practicum/activities/${nextActivity.id}`" class="primary-button">继续学习</NuxtLink><NuxtLink :to="`/practicum/learn/${primaryPlan.id}`" class="secondary-button">查看完整课程</NuxtLink></div>
            </section>
            <aside class="student-side">
              <section class="award-card"><span>实战成果</span><h3>成长数据</h3><p>连续学习与实操提交会同步计入能力成长。</p><NuxtLink to="/practicum/progress" class="text-link">查看成长数据 →</NuxtLink></section>
              <section class="review-card"><span>老师反馈</span><h3>{{ returnedWork ? '有待修改作业' : '学习状态良好' }}</h3><p>{{ returnedWork ? latestFeedback || '请根据老师反馈修改后再次提交。' : '当前没有被退回的作业。' }}</p><NuxtLink to="/practicum/tasks" class="text-link">查看我的任务 →</NuxtLink></section>
            </aside>
          </div>

          <section class="home-section"><div class="section-title"><div><p class="eyebrow">学习路线</p><h2>课程模块进度</h2></div><NuxtLink v-if="primaryPlan" :to="`/practicum/learn/${primaryPlan.id}`" class="text-link">进入课程 →</NuxtLink></div><div class="module-grid"><NuxtLink v-for="module in modules" :key="module.id" :to="primaryPlan ? `/practicum/learn/${primaryPlan.id}` : '/practicum'" class="module-card"><span>{{ store.getModuleProgress(module.id).percent }}%</span><b>{{ module.title }}</b><small>查看模块学习内容</small></NuxtLink></div></section>
        </section>

        <section v-else-if="store.state.activeRole === 'OWNER'" data-owner-home class="admin-home">
          <header class="admin-heading"><div><p class="eyebrow">运营总览</p><h1>管理员控制台</h1><p>实时跟踪课程运营、学员实操和待审核工作。</p></div><button type="button" class="primary-button" @click="showCreateForm = !showCreateForm">新建教学计划</button></header>
          <section class="admin-metrics"><article><span>总教学计划</span><b>{{ visiblePlans.length }}</b><small>已发布 {{ publishedPlanCount }} 个</small></article><article><span>待审核作业</span><b>{{ reviewQueueCount }}</b><small>需要及时处理</small></article><article><span>实操完成率</span><b>{{ studentProgress.percent }}%</b><small>当前发布计划</small></article><article><span>课程活动数</span><b>{{ caseCount }}</b><small>覆盖实训与案例任务</small></article></section>

          <section class="admin-metrics admin-metrics-refresh" aria-label="运营数据概览">
            <article v-for="metric in ownerMetrics" :key="metric.label" data-admin-metric class="admin-metric-card">
              <span class="metric-icon" :data-tone="metric.tone"><PracticumIcon :name="metric.icon" /></span>
              <span>{{ metric.label }}</span>
              <b>{{ metric.value }}</b>
              <small>{{ metric.detail }}</small>
            </article>
          </section>

          <div class="admin-layout">
            <aside data-admin-side class="admin-side-stack admin-side-stack-refresh">
              <section data-review-summary class="audit-card">
                <div class="card-heading">
                  <div><h2>快速审核</h2><p>优先处理已提交的实训作品。</p></div>
                  <span class="status-pill status-pill-orange">待审核 {{ reviewQueueCount }} 项</span>
                </div>
                <div v-if="firstReview" class="audit-body">
                  <b>{{ firstReview.activityTitle }}</b>
                  <p>已有学员提交，等待老师审核。</p>
                  <NuxtLink :to="`/practicum/submissions/${firstReview.submissionId}`" class="primary-button">进入审核</NuxtLink>
                </div>
                <div v-else class="audit-body"><b>暂无待审核作业</b><p>新的提交会出现在这里。</p></div>
              </section>
              <section data-activity-feed class="activity-card">
                <div class="card-heading"><div><h2>最新实操动态</h2><p>按最近提交的实训任务排列。</p></div></div>
                <NuxtLink v-for="item in recentReviewActivity" :key="item.submissionId" :to="`/practicum/submissions/${item.submissionId}`" class="activity-feed-row">
                  <span class="activity-avatar">{{ item.studentLabel.slice(0, 1) }}</span>
                  <span><b>{{ item.studentLabel }}</b><small>{{ item.activityTitle }}</small></span>
                  <span class="status-pill status-pill-orange">待审核</span>
                </NuxtLink>
                <p v-if="!recentReviewActivity.length" class="empty-state">暂无新的实操动态</p>
              </section>
              <section class="activity-card quick-links">
                <div class="card-heading"><div><h2>常用入口</h2><p>快速进入高频管理工作。</p></div></div>
                <NuxtLink to="/practicum/members">成员管理</NuxtLink>
                <NuxtLink to="/practicum/cases">案例库</NuxtLink>
                <NuxtLink to="/practicum/data-center">数据中心</NuxtLink>
              </section>
            </aside>
            <section class="management-card"><div class="card-heading"><div><h2>课程与章节管理</h2><p>按更新顺序查看当前实训教学计划。</p></div><NuxtLink to="/practicum/plans" class="text-link">全部计划 →</NuxtLink></div>
              <form v-if="showCreateForm" class="create-form" @submit.prevent="handleCreatePlan"><input v-model="newPlanTitle" required placeholder="输入教学计划名称"><input v-model="newPlanDesc" placeholder="输入教学计划说明"><button class="primary-button" type="submit" :disabled="isCreating">{{ isCreating ? '创建中…' : '确认创建' }}</button></form>
              <div class="plan-table"><div class="plan-table-head"><span>课程名称</span><span>状态</span><span>操作</span></div><div v-for="plan in visiblePlans" :key="plan.id" class="plan-table-row"><div><b>{{ plan.title }}</b><small>{{ plan.description || '暂无课程说明' }}</small></div><span class="status-pill" :class="plan.status === 'DRAFT' ? 'status-pill-orange' : ''">{{ planStatusLabel(plan.status) }}</span><NuxtLink :to="`/practicum/plans/${plan.id}/edit`" class="text-link">管理</NuxtLink></div></div>
            </section>
            <aside class="admin-side-stack"><section class="audit-card"><div class="card-heading"><div><h2>快速审核</h2><p>优先处理已提交的实训作品。</p></div><span class="audit-count">{{ reviewQueueCount }} 项</span></div><div v-if="firstReview" class="audit-body"><b>{{ firstReview.activityTitle }}</b><p>已有学员提交，等待老师审核。</p><NuxtLink :to="`/practicum/submissions/${firstReview.submissionId}`" class="primary-button">进入审核</NuxtLink></div><div v-else class="audit-body"><b>暂无待审核作业</b><p>新的提交会出现在这里。</p></div></section><section class="activity-card"><div class="card-heading"><div><h2>常用入口</h2><p>快速进入高频管理工作。</p></div></div><NuxtLink to="/practicum/members">成员管理</NuxtLink><NuxtLink to="/practicum/cases">案例库</NuxtLink><NuxtLink to="/practicum/data-center">数据与收益分析</NuxtLink></section></aside>
          </div>
        </section>

        <section v-else class="teacher-entry"><p class="eyebrow">教学工作区</p><h1>教师实训工作台</h1><p>查看已授权的课程内容、教学案例与学员提交情况。</p><div><NuxtLink to="/practicum/cases" class="primary-button">进入案例库</NuxtLink><NuxtLink to="/practicum/reviews" class="secondary-button">查看审核队列</NuxtLink></div></section>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CurriculumNode, Plan, PlanStatus } from '../../domain/practicum/types'
import { usePracticumStore } from '../../composables/usePracticumStore'
import { useCsrfHeaders } from '../../composables/useCsrfHeaders'

const store = usePracticumStore()
const isLoading = ref(true)
const serverPlans = ref<Plan[] | null>(null)
const showCreateForm = ref(false)
const newPlanTitle = ref('')
const newPlanDesc = ref('')
const isCreating = ref(false)

onMounted(async () => { if (store.state.activeRole === 'OWNER') { try { serverPlans.value = (await $fetch<{ items: Plan[] }>('/api/practicum/plans?page=1&pageSize=100&sort=updatedAt&direction=desc')).items } catch { serverPlans.value = [] } } isLoading.value = false })
const visiblePlans = computed(() => store.state.activeRole === 'OWNER' && serverPlans.value ? serverPlans.value : store.visiblePlansFor(store.state.activeRole))
const primaryPlan = computed(() => visiblePlans.value.find(plan => plan.status === 'PUBLISHED') ?? visiblePlans.value[0] ?? null)
const primaryNodes = computed(() => primaryPlan.value ? store.getPlanNodes(primaryPlan.value.id) : [])
const modules = computed(() => primaryNodes.value.filter(node => node.level === 1).sort((a, b) => a.sort - b.sort))
const nextActivity = computed<CurriculumNode | null>(() => primaryPlan.value ? store.getNextStudentActivity(primaryPlan.value.id) : null)
const returnedWork = computed(() => primaryNodes.value.find(node => store.state.practiceSubmissions[node.id]?.status === 'RETURNED') ?? null)
const latestFeedback = computed(() => returnedWork.value ? store.state.practiceSubmissions[returnedWork.value.id]?.feedback ?? '' : '')
const studentProgress = computed(() => primaryPlan.value ? store.getPlanProgress(primaryPlan.value.id) : { completed: 0, total: 0, percent: 0 })
const publishedPlanCount = computed(() => visiblePlans.value.filter(plan => plan.status === 'PUBLISHED').length)
const firstReview = computed(() => store.getReviewQueue().find(item => item.status === 'SUBMITTED') ?? null)
const reviewQueueCount = computed(() => store.getReviewQueue().filter(item => item.status === 'SUBMITTED').length)
const caseCount = computed(() => store.state.activities.filter(activity => activity.type === 'PRACTICE_ACTIVITY').length)
const ownerMetrics = computed(() => [
  { label: '教学计划', value: visiblePlans.value.length, detail: `已发布 ${publishedPlanCount.value} 项`, icon: 'book', tone: 'blue' },
  { label: '待审核作业', value: reviewQueueCount.value, detail: '需要及时处理', icon: 'clipboard-check', tone: 'amber' },
  { label: '实操完成率', value: `${studentProgress.value.percent}%`, detail: '当前发布计划', icon: 'trending-up', tone: 'green' },
  { label: '课程活动数', value: caseCount.value, detail: '实训与案例任务', icon: 'layers', tone: 'violet' },
])
const recentReviewActivity = computed(() => store.getReviewQueue().filter(item => item.status === 'SUBMITTED').slice(0, 4))
const contextTitle = computed(() => store.state.activeRole === 'OWNER' ? '管理员控制台' : store.state.activeRole === 'STUDENT' ? '学习中心' : '教师工作台')
const contextMeta = computed(() => store.state.activeRole === 'OWNER' ? '课程运营与实训审核' : store.state.activeRole === 'STUDENT' ? '实操课程与学习成长' : '教学案例与审核任务')
async function handleCreatePlan() { if (!newPlanTitle.value.trim() || isCreating.value) return; isCreating.value = true; try { const response = await $fetch<{ plan: Plan }>('/api/practicum/plans', { method: 'POST', headers: useCsrfHeaders({ 'Idempotency-Key': `plan-page-${Date.now()}` }), body: { roomId: store.state.room.id, title: newPlanTitle.value.trim(), description: newPlanDesc.value.trim() } }); serverPlans.value = [response.plan, ...(serverPlans.value ?? [])]; newPlanTitle.value = ''; newPlanDesc.value = ''; showCreateForm.value = false } finally { isCreating.value = false } }
function planStatusLabel(status: PlanStatus) { return status === 'PUBLISHED' ? '已发布' : status === 'ARCHIVED' ? '已归档' : '草稿' }
</script>

<style scoped>
.practicum-home{width:min(1280px,100%);margin:0 auto}.role-entry,.teacher-entry{padding:44px;border:1px solid var(--practicum-border);border-radius:14px;background:#fff}.role-entry h1,.teacher-entry h1{margin:5px 0 8px;font-size:30px}.role-entry p:not(.eyebrow),.teacher-entry p:not(.eyebrow){max-width:560px;margin:0 0 20px;color:var(--practicum-muted)}.student-welcome{display:flex;justify-content:space-between;gap:40px;padding:30px 34px;border:1px solid #cfe9ff;border-radius:16px;background:#eaf5ff}.student-welcome h1,.admin-heading h1{margin:4px 0;font-size:30px;letter-spacing:0}.student-welcome p:not(.eyebrow),.admin-heading p:not(.eyebrow){margin:0;color:var(--practicum-muted)}.student-facts{display:flex;gap:28px;margin-top:22px}.student-facts span{display:grid;gap:3px;color:var(--practicum-muted);font-size:12px}.student-facts b{color:var(--practicum-ink);font:800 22px/1 ui-monospace,monospace}.overall-progress{align-self:end;width:238px;padding:14px;border-radius:12px;background:#fff}.overall-progress span,.overall-progress small{color:var(--practicum-muted);font-size:12px}.overall-progress b{display:block;margin:4px 0;color:var(--practicum-accent);font:800 28px/1 ui-monospace,monospace}.progress-track{height:7px;margin:9px 0;overflow:hidden;border-radius:99px;background:#cfe9ff}.progress-track i{display:block;height:100%;border-radius:inherit;background:var(--practicum-accent)}.student-layout,.admin-layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.55fr);gap:16px;margin-top:16px}.learning-card,.award-card,.review-card,.management-card,.audit-card,.activity-card{padding:22px;border:1px solid var(--practicum-border);border-radius:14px;background:#fff;box-shadow:0 4px 18px rgba(30,41,59,.04)}.card-lead>span,.award-card>span,.review-card>span{color:var(--practicum-accent);font-size:12px;font-weight:800}.card-lead h2{margin:5px 0;font-size:21px}.card-lead p{margin:0;color:var(--practicum-muted)}.milestone-line{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:26px 0}.milestone{position:relative;padding:28px 10px 0 0;color:var(--practicum-muted);font-size:11px}.milestone::before{content:"";position:absolute;left:0;top:0;width:13px;height:13px;border:3px solid #d5e0ec;border-radius:50%;background:#fff;z-index:2}.milestone::after{content:"";position:absolute;left:12px;right:0;top:5px;height:3px;background:#d5e0ec}.milestone:last-child::after{display:none}.milestone i{display:none}.milestone b,.milestone small{display:block}.milestone b{color:var(--practicum-ink);font-size:12px}.milestone.done::before{border-color:var(--practicum-teal);background:var(--practicum-teal)}.milestone.done::after,.milestone.active::after{background:var(--practicum-accent)}.milestone.active::before{border-color:var(--practicum-accent);box-shadow:0 0 0 4px var(--practicum-accent-soft)}.learning-actions{display:flex;gap:10px}.student-side,.admin-side-stack{display:grid;gap:16px}.award-card{background:#fff9ef;border-color:#f3d39a}.review-card{background:#f8fbff}.award-card h3,.review-card h3{margin:5px 0;font-size:17px}.award-card p,.review-card p{margin:0 0 12px;color:var(--practicum-muted);font-size:13px}.home-section{margin-top:28px}.section-title,.admin-heading,.card-heading{display:flex;justify-content:space-between;align-items:end;gap:16px}.section-title h2,.card-heading h2{margin:3px 0;font-size:19px}.module-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:14px}.module-card{display:grid;gap:6px;min-height:126px;padding:16px;border:1px solid var(--practicum-border);border-radius:14px;background:#fff;color:var(--practicum-ink);text-decoration:none}.module-card:hover{border-color:#b8dcfb;box-shadow:0 7px 18px rgba(24,144,255,.1)}.module-card span{color:var(--practicum-accent);font:800 22px/1 ui-monospace,monospace}.module-card small{color:var(--practicum-muted)}.admin-heading{margin-bottom:18px}.admin-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.admin-metrics article{padding:18px;border:1px solid var(--practicum-border);border-radius:14px;background:#fff}.admin-metrics span,.admin-metrics small{display:block;color:var(--practicum-muted);font-size:12px}.admin-metrics b{display:block;margin:10px 0 5px;font:800 27px/1 ui-monospace,monospace}.management-card{padding:0;overflow:hidden}.management-card>.card-heading,.audit-card .card-heading,.activity-card .card-heading{padding:18px 20px;border-bottom:1px solid var(--practicum-border)}.card-heading p{margin:3px 0 0;color:var(--practicum-muted);font-size:12px}.create-form{display:grid;grid-template-columns:1fr 1fr auto;gap:9px;padding:14px 20px;background:#f8fbff;border-bottom:1px solid var(--practicum-border)}.create-form input{min-width:0;height:39px;padding:0 10px;border:1px solid var(--practicum-border);border-radius:9px}.plan-table-head,.plan-table-row{display:grid;grid-template-columns:minmax(0,1fr) 90px 60px;gap:12px;align-items:center;padding:13px 20px;border-bottom:1px solid var(--practicum-border)}.plan-table-head{color:var(--practicum-muted);font-size:11px;font-weight:750;background:#fbfcfe}.plan-table-row:last-child{border-bottom:0}.plan-table-row b,.plan-table-row small{display:block}.plan-table-row small{margin-top:3px;color:var(--practicum-muted);font-size:12px}.audit-count{color:var(--practicum-orange);font:800 13px ui-monospace,monospace}.audit-body{padding:18px 20px}.audit-body p{margin:4px 0 12px;color:var(--practicum-muted);font-size:13px}.activity-card{padding:0}.activity-card a{display:block;padding:13px 20px;border-bottom:1px solid var(--practicum-border);color:var(--practicum-ink);text-decoration:none;font-weight:700}.activity-card a:last-child{border-bottom:0}.activity-card a:hover{color:var(--practicum-accent);background:var(--practicum-accent-soft)}.teacher-entry div{display:flex;gap:10px}@media(max-width:980px){.student-layout,.admin-layout{grid-template-columns:1fr}.student-side{grid-template-columns:1fr 1fr}.module-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:640px){.student-welcome{display:grid;padding:24px}.student-welcome h1,.admin-heading h1{font-size:25px}.overall-progress{width:100%}.student-facts{gap:18px}.milestone-line{overflow:auto;min-width:560px}.learning-card{overflow:hidden}.student-side{grid-template-columns:1fr}.module-grid,.admin-metrics{grid-template-columns:1fr 1fr}.admin-heading{align-items:start;flex-direction:column}.create-form{grid-template-columns:1fr}.plan-table-head{display:none}.plan-table-row{grid-template-columns:1fr auto}.plan-table-row>a{grid-column:2}.teacher-entry{padding:28px}}
/* Refined administration dashboard */
.admin-metrics:not(.admin-metrics-refresh),.admin-layout>.admin-side-stack:not([data-admin-side]){display:none}.admin-metrics-refresh{margin-bottom:24px}.admin-metric-card{position:relative;display:grid;gap:6px;min-height:148px;padding:24px;background:#fff;border:0!important;border-radius:14px;box-shadow:0 12px 30px rgba(15,23,42,.07)}.admin-metric-card>span:not(.metric-icon),.admin-metric-card small{color:var(--practicum-muted);font-size:13px}.admin-metric-card b{margin:8px 0 0;color:var(--practicum-ink);font:800 30px/1 ui-monospace,monospace}.metric-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;color:var(--practicum-accent);background:#eaf5ff}.metric-icon[data-tone="amber"]{color:var(--practicum-orange);background:#fff3e8}.metric-icon[data-tone="green"]{color:var(--practicum-success);background:var(--practicum-success-soft)}.metric-icon[data-tone="violet"]{color:#7c3aed;background:#f3e8ff}.metric-icon .practicum-icon{width:20px;height:20px}.admin-layout{grid-template-columns:minmax(0,1.25fr) minmax(300px,.6fr);gap:24px;margin-top:0}.admin-side-stack-refresh{grid-column:2}.management-card{grid-column:1;grid-row:1}.management-card,.audit-card,.activity-card{border:0;box-shadow:0 12px 30px rgba(15,23,42,.07)}.management-card>.card-heading,.audit-card .card-heading,.activity-card .card-heading{padding:24px;border-bottom:1px solid #edf0f5}.plan-table-head,.plan-table-row{padding:16px 24px}.plan-table-row{min-height:76px}.audit-card{background:linear-gradient(135deg,#fff 0%,#fffaf3 100%)}.audit-card .status-pill{flex:0 0 auto}.audit-body{padding:24px}.activity-card{overflow:hidden}.activity-feed-row{display:grid!important;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:12px;min-height:68px}.activity-feed-row>span:nth-child(2){min-width:0}.activity-feed-row b,.activity-feed-row small{display:block}.activity-feed-row small{margin-top:3px;overflow:hidden;color:var(--practicum-muted);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.activity-avatar{display:grid;place-items:center;width:34px;height:34px;color:#0f5b97;background:#eaf5ff;border-radius:50%;font-size:13px;font-weight:800}.quick-links{margin-top:0}.create-form{padding:16px 24px}.create-form input{border:0;border-radius:14px;background:#f7f9fc}.create-form input:focus{outline:3px solid var(--practicum-focus)}
@media(max-width:980px){.admin-side-stack-refresh,.management-card{grid-column:auto;grid-row:auto}}@media(max-width:640px){.admin-metrics-refresh{grid-template-columns:1fr}.admin-metric-card{min-height:126px}.admin-layout{display:flex;flex-direction:column;gap:16px}.management-card{order:1;width:100%}.admin-side-stack-refresh{order:2;width:100%}.activity-feed-row{padding:14px 16px!important;grid-template-columns:34px minmax(0,1fr)}.activity-feed-row .status-pill{grid-column:2;justify-self:start}.plan-table-row{padding:16px}.management-card>.card-heading,.audit-card .card-heading,.activity-card .card-heading{padding:20px}.audit-body{padding:20px}}
</style>
