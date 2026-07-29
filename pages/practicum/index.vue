<template>
  <ClientOnly>
    <PracticumShell :context-title="contextTitle" :context-meta="contextMeta">
      <div data-practicum class="dashboard-page">
        <p v-if="isLoading" data-loading class="empty-state">正在加载工作台...</p>

        <section v-else-if="!store.state.activeRole" data-role-entry class="profile-page">
          <div class="page-heading">
            <div>
              <p class="eyebrow">数字商贸实训</p>
              <h1>选择身份后开始工作</h1>
              <p>管理员和学生共用同一套工作台，系统会按身份展示对应入口。</p>
            </div>
          </div>
          <div class="next-task">
            <div class="task-meta"><span class="status-pill">首次使用</span></div>
            <h2>进入你的实训工作区</h2>
            <p>前往账号与权限页面选择当前身份，工作台会自动切换成管理员或学生视角。</p>
            <NuxtLink to="/practicum/profile" data-to-profile-link class="primary-button">选择身份</NuxtLink>
          </div>
        </section>

        <section v-else-if="store.state.activeRole === 'STUDENT'" data-student-home>
          <div class="metric-strip">
            <div class="metric"><span>当前课程</span><strong>{{ visiblePlans.length }}</strong><small>{{ todayTaskHint }}</small></div>
            <div class="metric"><span>待完成</span><strong>{{ pendingTaskCount }}</strong><small data-deadline>最近截止 {{ deadlineLabel }}</small></div>
            <div data-task-summary class="metric metric-summary">
              <span>今日待办 · {{ pendingTaskCount }} 项</span>
              <strong>{{ nextActivity?.title ?? '查看当前任务' }}</strong>
              <small>{{ nextActivity?.description || '完成店铺基本信息配置的训练任务' }}</small>
              <span class="status-pill status-pill-red">待处理</span>
            </div>
            <div data-feedback-summary class="metric metric-summary">
              <span>老师反馈</span>
              <strong>{{ returnedWork ? '修改老师退回的作业' : '查看老师反馈' }}</strong>
              <small>{{ returnedWork ? latestFeedback || '根据老师批注重新提交。' : '暂无退回作业，可以查看历史反馈。' }}</small>
              <span class="status-pill" :class="returnedWork ? 'status-pill-orange' : ''">{{ returnedWork ? '待修改' : '正常' }}</span>
            </div>
          </div>

          <div class="dashboard-split dashboard-split-single">
            <section v-if="primaryPlan" data-plan-progress class="progress-band" aria-labelledby="student-progress-title">
              <div>
                <span class="eyebrow">学习进度</span>
                <h2 id="student-progress-title">{{ primaryPlan.title }}</h2>
                <p>{{ studentProgress.completed }} / {{ studentProgress.total }} 个必修活动已完成</p>
              </div>
              <div class="progress-track" role="progressbar" :aria-label="`完成 ${studentProgress.percent}%`" :aria-valuenow="studentProgress.percent" aria-valuemin="0" aria-valuemax="100">
                <span :style="{ width: studentProgress.percent + '%' }" />
              </div>
                <strong class="progress-number">{{ studentProgress.percent }}%<small>{{ studentProgress.completed }} / {{ studentProgress.total }}</small></strong>
            </section>

            <section data-next-task class="panel">
              <div class="panel-head">
                <div>
                  <strong>继续学习</strong>
                  <span>从上次位置继续学习</span>
                </div>
                <NuxtLink v-if="nextActivity" :to="`/practicum/activities/${nextActivity.id}`" class="primary-button">进入任务</NuxtLink>
              </div>
              <div class="timeline-list">
                <div v-if="nextActivity" class="timeline-row">
                  <span class="timeline-dot" />
                  <div><strong>{{ nextActivity.title }}</strong><span>{{ nextActivity.description || '继续完成当前实训活动。' }}</span></div>
                </div>
                <div v-if="returnedWork" class="timeline-row">
                  <span class="timeline-dot" />
                  <div><strong>修改老师退回的作业</strong><span>{{ latestFeedback || '查看老师反馈并重新提交。' }}</span></div>
                </div>
              </div>
            </section>

            <section v-if="primaryPlan" data-learning-route class="panel" style="margin-top: 16px;">
              <div class="panel-head"><div><strong>学习路线</strong><span>按模块查看实训进度</span></div></div>
              <div class="row-list">
                <NuxtLink v-for="module in modules" :key="module.id" data-route-item :to="`/practicum/learn/${primaryPlan.id}`" class="row-item">
                  <div><strong>{{ module.title }}</strong><span>进入模块学习</span></div>
                  <span class="mini-progress" :aria-label="`${store.getModuleProgress(module.id).percent}%`">{{ store.getModuleProgress(module.id).percent }}%</span>
                </NuxtLink>
              </div>
            </section>

            <section v-if="returnedWork" data-returned-work class="panel" style="margin-top: 16px;">
              <div class="panel-head"><div><strong>退回作业</strong><span>请根据老师反馈修改后重新提交</span></div></div>
              <p>{{ returnedWork.title }}</p>
              <p data-recent-feedback class="muted-copy">{{ latestFeedback || '暂无文字反馈。' }}</p>
            </section>

            <section v-if="visiblePlans.length" class="panel" style="margin-top: 16px;">
              <div class="panel-head">
                <div>
                  <strong>可用课程</strong>
                  <span>已发布的课程计划</span>
                </div>
              </div>
              <div class="row-list">
                <div v-for="plan in visiblePlans" :key="plan.id" class="row-item">
                  <div>
                    <NuxtLink :to="`/practicum/learn/${plan.id}`" data-plan-link :data-plan-id="plan.id">
                      <strong>{{ plan.title }}</strong>
                    </NuxtLink>
                    <span>{{ plan.description }}</span>
                  </div>
                  <div class="row-actions">
                    <span class="status-pill">已发布</span>
                    <NuxtLink :to="`/practicum/learn/${plan.id}`" :aria-label="`开始学习${plan.title}`" class="secondary-button compact-action">开始学习</NuxtLink>
                  </div>
                </div>
              </div>
            </section>

          </div>

          <section class="dashboard-section">
            <div class="section-heading compact-heading">
              <div>
                <h2>我的快捷入口</h2>
                <p>学生端保留学习、提交、反馈三类高频动作。</p>
              </div>
            </div>
            <div class="quick-grid">
              <NuxtLink to="/practicum/tasks" class="tool-card">
                <span class="tool-icon"><PracticumIcon name="upload" /></span>
                <strong>提交作业</strong>
                <span>查看待提交、待修改和老师反馈。</span>
              </NuxtLink>
              <NuxtLink to="/practicum/progress" class="tool-card">
                <span class="tool-icon"><PracticumIcon name="trending-up" /></span>
                <strong>成长数据</strong>
                <span>看完成率、能力点和薄弱项。</span>
              </NuxtLink>
              <NuxtLink to="/practicum/cases" class="tool-card">
                <span class="tool-icon"><PracticumIcon name="book" /></span>
                <strong>案例训练</strong>
                <span>继续当前案例或查看老师推荐。</span>
              </NuxtLink>
            </div>
          </section>
        </section>

        <section v-else-if="store.state.activeRole === 'TEACHER' || store.state.activeRole === 'MENTOR'" data-teacher-home class="profile-page">
          <div class="page-heading">
            <div>
              <p class="eyebrow">教学工作区</p>
              <h1>教师工作台</h1>
              <p>课堂作业、公告和授课模式会在教学模块启用后出现在这里。</p>
            </div>
          </div>
          <div class="next-task">
            <div class="task-meta"><span class="status-pill">已授权</span></div>
            <h2>查看教学计划</h2>
            <p>你可以查看当前实训室的已发布计划；管理、发布和批阅权限不会从管理员账号继承。</p>
            <NuxtLink to="/practicum/cases" class="primary-button">查看可用案例</NuxtLink>
          </div>
        </section>

        <section v-else-if="store.state.activeRole === 'OWNER'" data-owner-home>
          <div class="metric-strip">
            <div class="metric"><span>全部计划</span><strong>{{ visiblePlans.length }}</strong><small>{{ publishedPlanCount }} 个已发布</small></div>
            <div class="metric"><span>进行中案例</span><strong>{{ caseCount }}</strong><small>来自案例库与课程活动</small></div>
            <div class="metric"><span>任务完成率</span><strong>{{ studentProgress.percent }}%</strong><small>当前发布计划</small></div>
            <div data-owner-todo-summary class="metric metric-summary">
              <span>待处理事项 · {{ reviewQueueCount }} 项</span>
              <strong>审核学生提交</strong>
              <small>发布课堂资料与确认实训室配置可从常用入口进入。</small>
              <span class="status-pill status-pill-orange">待处理</span>
            </div>
          </div>

          <div class="dashboard-split dashboard-split-single">
            <section class="panel">
              <div class="panel-head">
                <div>
                  <strong>当前计划</strong>
                  <span>按更新时间排列</span>
                </div>
                <button data-create-plan class="secondary-button" type="button" @click="showCreateForm = !showCreateForm">新建计划</button>
              </div>

              <form v-if="showCreateForm" data-create-plan-form class="form-panel inline-form" @submit.prevent="handleCreatePlan">
                <div class="form-grid">
                  <label class="field">计划名称<input data-plan-title-input v-model="newPlanTitle" type="text" placeholder="输入教学计划名称"></label>
                  <label class="field">计划描述<input data-plan-desc-input v-model="newPlanDesc" type="text" placeholder="输入教学计划描述"></label>
                </div>
                <div class="form-actions">
                  <button data-plan-submit class="primary-button" type="submit" :disabled="isCreating">确认创建</button>
                  <button data-plan-cancel class="secondary-button" type="button" @click="showCreateForm = false">取消</button>
                </div>
              </form>

              <div id="plans" data-plan-list class="row-list">
                <div v-for="plan in visiblePlans" :key="plan.id" data-plan-card class="row-item">
                  <div><strong>{{ plan.title }}</strong><span>{{ plan.description }}</span></div>
                  <div class="row-actions">
                    <span class="status-pill" :class="plan.status === 'DRAFT' ? 'status-pill-orange' : ''">{{ planStatusLabel(plan.status) }}</span>
                    <NuxtLink :to="`/practicum/plans/${plan.id}/edit`" :aria-label="`管理${plan.title}计划`" class="secondary-button compact-action">管理</NuxtLink>
                  </div>
                </div>
              </div>
            </section>

          </div>

          <section class="dashboard-section">
            <div class="section-heading compact-heading">
              <div>
                <h2>常用入口</h2>
                <p>常用教学与管理工具</p>
              </div>
              <NuxtLink v-if="firstReview" data-review-quick-link :to="`/practicum/submissions/${firstReview.submissionId}`" class="primary-button">快捷审核</NuxtLink>
            </div>
            <div class="quick-grid">
              <NuxtLink to="/practicum#plans" class="tool-card">
                <span class="tool-icon"><PracticumIcon name="plus-square" /></span>
                <strong>创建课堂任务</strong>
                <span>给班级发任务、材料和截止时间。</span>
              </NuxtLink>
              <NuxtLink to="/practicum/cases" class="tool-card">
                <span class="tool-icon"><PracticumIcon name="folder" /></span>
                <strong>进入案例库</strong>
                <span>按行业、难度和能力点筛选案例。</span>
              </NuxtLink>
              <NuxtLink to="/practicum/reviews" class="tool-card">
                <span class="tool-icon"><PracticumIcon name="clipboard-check" /></span>
                <strong>查看待审核</strong>
                <span>集中处理报告和课堂反馈。</span>
              </NuxtLink>
            </div>
          </section>
        </section>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { CurriculumNode, PlanStatus } from '../../domain/practicum/types'
import { usePracticumStore } from '../../composables/usePracticumStore'

const store = usePracticumStore()
const isLoading = ref(true)
onMounted(() => { isLoading.value = false })

const visiblePlans = computed(() => store.visiblePlansFor(store.state.activeRole))
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
const pendingTaskCount = computed(() => primaryNodes.value.filter(node => node.level === 3 && !store.isActivityComplete(node.id)).length)
const todayTaskHint = computed(() => pendingTaskCount.value ? `${Math.min(pendingTaskCount.value, 2)} 项今日相关任务` : '今日暂无待办')
const deadlineLabel = computed(() => {
  if (!primaryPlan.value) return '暂无'
  const raw = store.state.planDeadlines[primaryPlan.value.id]
  if (!raw) return '暂无'
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const d = new Date(raw)
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const contextTitle = computed(() => {
  if (store.state.activeRole === 'OWNER') return '总览'
  if (store.state.activeRole === 'TEACHER' || store.state.activeRole === 'MENTOR') return '教师工作台'
  if (store.state.activeRole === 'STUDENT') return '总览'
  return '实训工作台'
})
const contextMeta = computed(() => {
  if (store.state.activeRole === 'OWNER') return '管理教学计划、审核提交与查看数据'
  if (store.state.activeRole === 'TEACHER' || store.state.activeRole === 'MENTOR') return '查看已授权的实训内容与教学任务'
  if (store.state.activeRole === 'STUDENT') return '数字商贸实训室 · 课程学习与任务提交'
  return '数字商贸实训室 01'
})

const showCreateForm = ref(false)
const newPlanTitle = ref('')
const newPlanDesc = ref('')
const isCreating = ref(false)

function handleCreatePlan() {
  if (!newPlanTitle.value.trim() || isCreating.value) return
  isCreating.value = true
  try {
    store.createPlan({ title: newPlanTitle.value.trim(), description: newPlanDesc.value.trim() })
    newPlanTitle.value = ''
    newPlanDesc.value = ''
    showCreateForm.value = false
  } finally {
    isCreating.value = false
  }
}

function planStatusLabel(status: PlanStatus) {
  if (status === 'PUBLISHED') return '已发布'
  if (status === 'ARCHIVED') return '已归档'
  return '草稿'
}

</script>
