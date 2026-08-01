<template>
  <ClientOnly>
    <PracticumShell :context-title="plan?.title ?? '实操学习'" :context-meta="planMeta">
      <PracticumStatePanel v-if="isLoading" state="loading" title="正在加载课程" description="正在整理课程大纲、学习材料和实操任务。" />
      <PracticumStatePanel v-else-if="!canAccessLearning(store.state.activeRole)" data-forbidden state="forbidden" title="请使用学生身份访问学习内容" description="学习页只展示给学生身份，管理员可在课程管理中维护内容。" />
      <PracticumStatePanel v-else-if="plan && !canViewPlan(store.state.activeRole, plan.status)" data-forbidden state="forbidden" title="课程暂未发布" description="该计划还不能进入学习，请等待教学管理员发布。" />
      <PracticumStatePanel v-else-if="!plan" state="empty" title="计划未找到" description="该课程可能已归档，或当前身份没有访问权限。" />

      <section v-else class="learning" data-learn-plan>
        <aside class="outline">
          <h4>课程大纲</h4>
          <button
            v-for="(activity, index) in activities"
            :key="activity.id"
            type="button"
            :class="{ active: learningPosition === activity.id }"
            @click="store.setLearningPosition(plan.id, activity.id)"
          >
            {{ store.isActivityComplete(activity.id) ? '✓' : '○' }} 第 {{ index + 1 }} 节 {{ activity.title }}
          </button>
          <h4 v-if="modules.length">模块</h4>
          <div v-for="module in modules.slice(0, 3)" :key="module.id">{{ module.title }}</div>
        </aside>

        <main class="lesson">
          <h2>{{ currentActivity?.title ?? plan.title }}</h2>
          <p>{{ currentModule?.title ?? '课程学习' }} · 预计学习 12 分钟 · {{ progressPercent }}% 完成</p>
          <div class="video" aria-label="视频或沙箱实操播放器" />

          <section class="lesson-card">
            <b>课程说明</b><br>
            {{ plan.description || '完成本节后，你将能够根据任务要求整理电商经营素材，提交实操结果，并根据老师反馈继续迭代。' }}
          </section>

          <section class="lesson-card">
            <b>实操任务</b><br>
            {{ currentActivity?.description || '下载实训素材，完成当前任务并保存草稿或提交作业。' }}<br>
            <NuxtLink to="/practicum/resources" class="blue-btn" style="margin-top:8px">下载材料</NuxtLink>
            <NuxtLink v-if="currentActivity" :to="`/practicum/activities/${currentActivity.id}`" class="blue-btn" style="margin-top:8px;margin-left:8px">开始实操</NuxtLink>
          </section>
        </main>

        <aside class="drawer">
          <div class="drawer-head">讨论 / 评价 <span>×</span></div>
          <input class="search" style="width:100%;margin:13px 0" placeholder="搜索讨论">
          <div class="teacher">
            <div class="teacher-avatar">周</div>
            <div>
              <b>讲师：周老师</b>
              <p>负责数字商贸实操课程，重点关注作业证据、数据复盘和改进建议。</p>
            </div>
          </div>
          <div class="comment">
            <b>老师反馈</b><span class="rating">★★★★★</span>
            <p>{{ feedbackText }}</p>
          </div>
          <div class="comment">
            <b>学习提醒</b>
            <p>提交前请检查材料完整性，避免重复提交。被退回后可根据反馈再次提交。</p>
          </div>
        </aside>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { canAccessLearning, canViewPlan } from '~/domain/practicum/permissions'

const route = useRoute()
const store = usePracticumStore()
const isLoading = ref(true)

onMounted(() => { isLoading.value = false })

const planId = computed(() => route.params.planId as string)
const plan = computed(() => store.state.plans.find(item => item.id === planId.value) ?? null)
const planNodes = computed(() => store.getPlanNodes(planId.value))
const modules = computed(() => planNodes.value.filter(node => node.level === 1).sort((a, b) => a.sort - b.sort))
const activities = computed(() => planNodes.value.filter(node => node.level === 3).sort((a, b) => a.sort - b.sort))
const progress = computed(() => store.getPlanProgress(planId.value))
const progressPercent = computed(() => progress.value.percent)
const learningPosition = computed(() => {
  const saved = store.getLearningPosition(planId.value)
  return saved ?? activities.value[0]?.id ?? null
})
const currentActivity = computed(() => activities.value.find(activity => activity.id === learningPosition.value) ?? activities.value[0] ?? null)
const currentModule = computed(() => {
  if (!currentActivity.value) return modules.value[0] ?? null
  const unit = planNodes.value.find(node => node.id === currentActivity.value?.parentId)
  return modules.value.find(node => node.id === unit?.parentId) ?? modules.value[0] ?? null
})
const planMeta = computed(() => plan.value ? `已发布 · ${modules.value.length} 模块 · ${activities.value.length} 个任务` : '学习材料与实操任务')
const feedbackText = computed(() => {
  if (!currentActivity.value) return '完成任务后，这里会显示老师的批改建议。'
  const submission = store.state.practiceSubmissions[currentActivity.value.id]
  return submission?.feedback ?? '选品模板很实用，跟着步骤完成后更知道从哪里开始分析。'
})
</script>

<style scoped>
.teacher {
  display: flex;
  gap: 10px;
  margin: 18px 0;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}
.teacher-avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: var(--blue);
  background: #e5f2ff;
  border-radius: 50%;
  font-weight: 800;
}
.teacher b { font-size: 11px; }
.teacher p,
.comment p {
  margin: 3px 0;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.55;
}
.comment {
  padding: 10px 0;
  border-top: 1px solid var(--line);
}
.comment b { font-size: 10px; }
.rating {
  margin-left: 8px;
  color: #f3ae40;
  font-size: 11px;
}
</style>
