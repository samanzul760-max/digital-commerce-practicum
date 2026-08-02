<template>
  <ClientOnly>
    <PracticumShell context-title="首页" context-meta="数字商贸实训工作台">
      <PracticumStatePanel
        v-if="!store.state.activeRole"
        state="forbidden"
        title="请选择实训身份"
        description="选择学生或管理员身份后，工作台会展示对应的课程、任务和管理入口。"
      />

      <section v-else class="view active" data-practicum>
        <div class="hero learnec-hero">
          <div class="hero-copy">
            <h1>{{ heroTitle }}<br>实战教学平台</h1>
            <p>{{ heroDescription }}</p>
            <NuxtLink :to="primaryTo" class="blue-btn">{{ primaryLabel }}</NuxtLink>
          </div>
          <div class="hero-scene home-hero-art" data-home-hero-art aria-hidden="true">
            <div class="hero-data-card">
              <span>店铺增长</span>
              <strong>86%</strong>
              <i /><i /><i />
            </div>
            <div class="hero-store-window" data-store-window>
              <b>实训店铺</b>
              <span /><span /><span />
            </div>
            <div class="hero-achievement">完成<br>首单</div>
          </div>
        </div>

        <div class="wrap section">
          <h2>{{ store.state.activeRole === 'OWNER' ? '课程与计划' : '热门课程' }}</h2>
          <p>{{ store.state.activeRole === 'OWNER' ? '从真实教学计划进入课程维护、批阅和数据跟踪。' : '从真实业务任务开始，完成你的第一份电商作品。' }}</p>
          <div v-if="visiblePlans.length" class="cards">
            <PracticumCourseCard
              v-for="plan in visiblePlans.slice(0, 3)"
              :key="plan.id"
              :plan="plan"
              :module-count="moduleCount(plan.id)"
              :activity-count="activityCount(plan.id)"
              :can-learn="store.state.activeRole === 'STUDENT' && plan.status === 'PUBLISHED'"
              :can-manage="store.state.activeRole === 'OWNER'"
            />
          </div>
          <PracticumStatePanel v-else state="empty" title="暂无课程" description="发布课程后，这里会显示可学习或可管理的实训课程。" />
        </div>

        <div class="wrap section home-entry-section">
          <h2>功能入口</h2>
          <p>把课程、实操、进度和提醒补齐成可点击入口，后续每个入口都能继续接后端数据。</p>
          <div class="home-entry-grid">
            <NuxtLink
              v-for="entry in homeEntries"
              :key="entry.to"
              :to="entry.to"
              class="home-entry-card"
              data-home-entry-card
            >
              <span>{{ entry.tag }}</span>
              <strong>{{ entry.title }}</strong>
              <p>{{ entry.description }}</p>
            </NuxtLink>
          </div>
        </div>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePracticumStore } from '~/composables/usePracticumStore'

const store = usePracticumStore()
const visiblePlans = computed(() => store.visiblePlansFor(store.state.activeRole)
  .filter(plan => !isShellCourse(plan))
  .filter(plan => store.state.activeRole !== 'STUDENT' || plan.status === 'PUBLISHED')
  .filter(plan => store.state.activeRole !== 'STUDENT' || hasLearnableContent(plan)))
const firstPublishedPlan = computed(() => store.state.plans.find(plan => plan.status === 'PUBLISHED' && !isShellCourse(plan)) ?? null)
const heroTitle = computed(() => store.state.activeRole === 'OWNER' ? '管理数字商贸实训' : '掌握电商未来')
const heroDescription = computed(() => store.state.activeRole === 'OWNER'
  ? '把课程、成员、实训任务和批阅进度连接起来，让每一次教学推进都有清晰依据。'
  : '把课程、实训任务和老师反馈连接起来，让每一次学习都看得见进步。')
const primaryLabel = computed(() => store.state.activeRole === 'OWNER' ? '进入教学管理' : '立即开始')
const primaryTo = computed(() => store.state.activeRole === 'OWNER'
  ? '/practicum/reviews'
  : firstPublishedPlan.value ? `/practicum/learn/${firstPublishedPlan.value.id}` : '/practicum/courses')
const homeEntries = computed(() => {
  const entries = [
    {
      tag: '课程',
      title: '课程大厅',
      description: '查看已发布课程、筛选难度，并进入课程详情。',
      to: '/practicum/courses',
    },
    {
      tag: '教程',
      title: '教程中心',
      description: '阅读本地原创教程、提交要求和评分标准。',
      to: '/practicum/tutorials',
    },
    {
      tag: '实操',
      title: '继续学习',
      description: '进入视频学习、实操任务和右侧学习大纲。',
      to: firstPublishedPlan.value ? `/practicum/learn/${firstPublishedPlan.value.id}` : '/practicum/courses',
    },
    {
      tag: '进度',
      title: '学员中心',
      description: '查看课程进度、打卡提醒和后端同步统计。',
      to: '/practicum/progress',
    },
  ]

  if (store.state.activeRole === 'STUDENT') {
    entries.push(
      {
        tag: '任务',
        title: '待办任务',
        description: '查看未完成的实操活动、退回修改和待提交作业。',
        to: '/practicum/tasks',
      },
      {
        tag: '提醒',
        title: '通知中心',
        description: '查看老师批改反馈、课程提醒和学习通知。',
        to: '/practicum/notifications',
      },
      {
        tag: '数据',
        title: '我的数据',
        description: '查看学习进度、能力维度评分和成长趋势。',
        to: '/practicum/progress',
      },
    )
  } else {
    entries.push(
      {
        tag: '批改',
        title: '批阅中心',
        description: '进入提交队列，处理评分和退回反馈。',
        to: '/practicum/reviews',
      },
      {
        tag: '成员',
        title: '成员管理',
        description: '管理学生、教师列表，分配班级和虚拟组。',
        to: '/practicum/members',
      },
      {
        tag: '数据',
        title: '数据中心',
        description: '查看课程完成率、学生排行榜和导出数据。',
        to: '/practicum/data-center',
      },
    )
  }

  return entries
})

function moduleCount(planId: string) {
  return store.getPlanNodes(planId).filter(node => node.level === 1).length
}
function activityCount(planId: string) {
  return store.getPlanNodes(planId).filter(node => node.level === 3).length
}

function isShellCourse(plan: { title: string; status?: string; moduleIds?: readonly string[] | string[] }): boolean {
  if (/publish-\d+/i.test(plan.title)) return true
  if (!plan.title?.trim()) return true
  return false
}

function hasLearnableContent(plan: { id: string; moduleIds?: readonly string[] | string[] }): boolean {
  const localModules = store.getPlanNodes(plan.id).some(node => node.level === 1)
  return localModules || (plan.moduleIds?.length ?? 0) > 0
}
</script>
