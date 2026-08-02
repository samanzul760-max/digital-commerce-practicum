<template>
  <ClientOnly>
    <PracticumShell context-title="成就" context-meta="查看技能成长、勋章进度与奖励记录">
      <main v-if="isOwner" class="admin-achievements-page" data-admin-achievements-page>
        <PracticumStatePanel v-if="adminLoading" state="loading" title="正在汇总班级学习情况" description="正在读取当前实训室的完成数据与评分结果。" />
        <PracticumStatePanel v-else-if="adminError" data-admin-achievements-error state="error" title="班级成就数据暂时无法加载" description="请检查网络后重试，页面不会使用本地数据替代班级统计。" @retry="loadAdminAchievements" />
        <PracticumStatePanel v-else-if="!adminAnalytics?.items.length" data-admin-achievements-empty state="empty" title="暂时没有可观察的学生数据" description="学生加入实训室并完成任务后，这里会显示班级完成情况。" />
        <template v-else>
          <section class="admin-achievement-heading">
            <div>
              <p class="eyebrow">学习成就观测</p>
              <h1>学生完成情况</h1>
              <p>聚焦当前实训室的任务完成、评分表现与能力维度。</p>
            </div>
            <NuxtLink to="/practicum/reviews" class="primary-button">处理待批阅作业</NuxtLink>
          </section>

          <section class="admin-achievement-metrics" data-achievement-metrics aria-label="班级学习概览">
            <div class="paper"><span>学生人数</span><strong>{{ adminAnalytics.summary.learnerCount }}</strong></div>
            <div class="paper"><span>平均完成率</span><strong>{{ adminAnalytics.summary.averageCompletionPercent }}%</strong></div>
            <div class="paper"><span>已完成任务</span><strong>{{ adminAnalytics.summary.completedTaskCount }}</strong></div>
            <div class="paper"><span>待批阅</span><strong>{{ adminAnalytics.summary.pendingReviewCount }}</strong></div>
          </section>

          <section v-if="adminAnalytics.groups.length" class="achievement-group-grid" aria-label="虚拟分组概览">
            <article v-for="group in adminAnalytics.groups" :key="group.groupLabel" data-achievement-group class="achievement-group-summary paper">
              <div><span>虚拟分组</span><h2>{{ group.groupLabel }}</h2></div>
              <dl><div><dt>学生</dt><dd>{{ group.learnerCount }} 人</dd></div><div><dt>平均完成率</dt><dd>{{ group.averageCompletionPercent }}%</dd></div><div><dt>已完成任务</dt><dd>{{ group.completedTaskCount }}</dd></div></dl>
            </article>
          </section>

          <section class="admin-achievement-overview">
            <article class="admin-achievement-panel radar-panel paper" data-achievement-radar>
              <div class="admin-achievement-panel-head"><div><h2>班级能力画像</h2><p>依据已评分实操的量规维度汇总。</p></div></div>
              <div class="radar-layout">
                <svg class="achievement-radar" viewBox="-32 -24 304 288" role="img" aria-label="班级六维能力雷达图">
                  <polygon class="radar-grid" points="120,24 203,72 203,168 120,216 37,168 37,72" />
                  <polygon class="radar-grid radar-grid-inner" points="120,56 175,88 175,152 120,184 65,152 65,88" />
                  <line v-for="(point, index) in radarAxisPoints" :key="index" class="radar-axis" x1="120" y1="120" :x2="point.x" :y2="point.y" />
                  <polygon class="radar-value" :points="radarPoints" />
                  <circle v-for="(point, index) in radarValuePoints" :key="`value-${index}`" class="radar-dot" :cx="point.x" :cy="point.y" r="3" />
                  <g v-for="(point, index) in radarLabelPoints" :key="`label-${index}`" data-radar-label>
                    <title>{{ adminAnalytics.skillDimensions[index]?.skill }}</title>
                    <text class="radar-label" :x="point.x" :y="point.y" :text-anchor="radarLabelAnchor(point.x)">{{ truncateLabel(adminAnalytics.skillDimensions[index]?.skill ?? '') }}</text>
                  </g>
                </svg>
                <ul class="radar-legend">
                  <li v-for="dimension in adminAnalytics.skillDimensions" :key="dimension.skill"><span /><strong :title="dimension.skill">{{ dimension.skill }}</strong><b>{{ dimension.score }}%</b></li>
                </ul>
              </div>
            </article>

            <article class="admin-achievement-panel paper" data-achievement-ranking>
              <div class="admin-achievement-panel-head"><div><h2>完成率排名</h2><p>按已评分任务占全部实操任务的比例排序。</p></div></div>
              <ol class="achievement-ranking-list">
                <li v-for="(member, index) in rankedMembers" :key="member.memberId">
                  <span class="ranking-position">{{ index + 1 }}</span>
                  <NuxtLink :to="`/practicum/member-data/${member.memberId}`" data-achievement-member-link class="achievement-member-link">
                    <span class="achievement-avatar">{{ memberInitial(member.learnerLabel) }}</span>
                    <strong :title="member.learnerLabel">{{ member.learnerLabel }}</strong>
                  </NuxtLink>
                  <span class="ranking-score">{{ member.completionPercent }}%</span>
                </li>
              </ol>
            </article>
          </section>

          <section class="admin-achievement-panel admin-member-panel paper" data-achievement-member-list>
            <div class="admin-achievement-panel-head"><div><h2>学生完成情况</h2><p>点击头像或姓名，查看该学生的计划完成、得分和能力明细。</p></div></div>
            <div class="achievement-member-table" role="table" aria-label="学生完成情况">
              <div class="achievement-member-table-head" role="row"><span>学生</span><span>分组</span><span>完成率</span><span>已评分</span><span>平均得分</span></div>
              <div v-for="member in adminAnalytics.items" :key="member.memberId" :data-demo-achievement-member="member.isDemo ? '' : undefined" class="achievement-member-row" role="row">
                <NuxtLink :to="`/practicum/member-data/${member.memberId}`" data-achievement-member-link class="achievement-member-link">
                  <span class="achievement-avatar">{{ memberInitial(member.learnerLabel) }}</span>
                  <strong :title="member.learnerLabel">{{ member.learnerLabel }}</strong>
                </NuxtLink>
                <span class="member-group-label">{{ member.groupLabel ?? '未分组' }}</span>
                <div class="member-progress"><span><i :style="{ width: `${member.completionPercent}%` }" /></span><b>{{ member.completionPercent }}%</b></div>
                <span>{{ member.gradedCount }}</span>
                <span>{{ member.avgScore }}%</span>
              </div>
            </div>
          </section>
        </template>
      </main>

      <main v-else-if="store.state.activeRole === 'STUDENT'" class="achievements-page" data-achievements-page>
        <section class="achievement-overview" data-achievement-overview>
          <div class="achievement-visual" aria-hidden="true">
            <span class="achievement-spark spark-one">✦</span>
            <span class="achievement-spark spark-two">✦</span>
            <div class="achievement-medal"><span>★</span></div>
            <div class="achievement-ribbon"><i /><i /></div>
          </div>
          <div>
            <p class="achievement-eyebrow">学习成就档案</p>
            <h1>{{ overview.title }}</h1>
            <p>每一次实操、提交和评分都会沉淀为可追踪的成长记录。</p>
          </div>
          <div class="achievement-metrics">
            <div><span>已解锁勋章</span><strong>{{ overview.unlocked }} <small>/ {{ overview.total }}</small></strong></div>
            <div><span>实训积分</span><strong>{{ overview.points.toLocaleString() }} <small>PTS</small></strong></div>
            <NuxtLink to="/practicum/tasks" class="primary-button">继续完成任务</NuxtLink>
          </div>
        </section>

        <section class="achievement-section" data-skill-matrix>
          <div class="achievement-section-head"><div><h2>技能矩阵</h2><p>根据已完成的实训任务和评分结果更新。</p></div></div>
          <div class="skill-matrix">
            <article v-for="skill in skills" :key="skill.name" class="skill-row">
              <div><strong>{{ skill.name }}</strong><span>Lv.{{ skill.level }} · {{ skill.note }}</span></div>
              <div class="skill-progress"><i :style="{ width: `${skill.percent}%` }" /></div>
              <b>{{ skill.percent }}%</b>
            </article>
          </div>
        </section>

        <section class="achievement-section">
          <div class="achievement-section-head badge-head"><div><h2>勋章墙</h2><p>解锁勋章，积累你的电商实训成长记录。</p></div><div class="badge-tabs" role="tablist" aria-label="勋章筛选"><button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button></div></div>
          <div class="badge-grid">
            <article v-for="badge in filteredBadges" :key="badge.id" class="badge-card" :class="`badge-${badge.state}`" data-badge-card :data-badge-state="badge.state">
              <div class="badge-icon" aria-hidden="true">{{ badge.state === 'locked' ? '🔒' : badge.icon }}</div>
              <div class="badge-card-main"><span>{{ badge.category }}</span><h3>{{ badge.name }}</h3><p>{{ badge.condition }}</p><template v-if="badge.state === 'unlocked'"><b>已于 {{ badge.unlockedAt }} 解锁</b><small>+{{ badge.reward }} PTS</small></template><template v-else><div class="badge-progress"><i :style="{ width: `${Math.round(badge.progress / badge.target * 100)}%` }" /></div><b>{{ badge.progress }} / {{ badge.target }}</b></template></div>
            </article>
          </div>
        </section>

        <section class="achievement-section" data-achievement-timeline>
          <div class="achievement-section-head"><div><h2>最新解锁与奖励</h2><p>近期勋章、积分和优秀实操记录。</p></div></div>
          <ol class="achievement-timeline"><li v-for="item in timeline" :key="item.id"><span class="timeline-dot" :class="item.type" /><div><time>{{ item.date }}</time><strong>{{ item.title }}</strong><p>{{ item.detail }}</p></div></li></ol>
        </section>
      </main>
      <PracticumStatePanel v-else state="forbidden" title="当前身份暂不支持成就数据" description="请使用学生身份查看个人成就，或使用管理员身份查看班级完成情况。" />
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { type AdminAchievementAnalytics, usePracticumServer } from '~/composables/usePracticumServer'
import { achievementBadges, achievementOverview, achievementTimeline, skillMatrix } from '~/data/practicum/achievement-catalog'

const store = usePracticumStore()
const server = usePracticumServer()
const overview = achievementOverview
const skills = skillMatrix
const timeline = achievementTimeline
const activeTab = ref<'all' | 'unlocked' | 'pending'>('all')
const tabs = [{ id: 'all' as const, label: '全部勋章' }, { id: 'unlocked' as const, label: '已解锁' }, { id: 'pending' as const, label: '进行中 / 未解锁' }]
const filteredBadges = computed(() => activeTab.value === 'all' ? achievementBadges : activeTab.value === 'unlocked' ? achievementBadges.filter(item => item.state === 'unlocked') : achievementBadges.filter(item => item.state !== 'unlocked'))
const isOwner = computed(() => store.state.activeRole === 'OWNER')
const roomId = computed(() => String(store.state.room.id ?? ''))
const adminAnalytics = ref<AdminAchievementAnalytics | null>(null)
const adminLoading = ref(false)
const adminError = ref(false)
const rankedMembers = computed(() => adminAnalytics.value?.items.slice(0, 5) ?? [])

const radarAxisPoints = Array.from({ length: 6 }, (_, index) => radarPoint(index, 96))
const radarLabelPoints = Array.from({ length: 6 }, (_, index) => radarPoint(index, 116))
const radarValuePoints = computed(() => (adminAnalytics.value?.skillDimensions ?? []).map((item, index) => radarPoint(index, 96 * item.score / 100)))
const radarPoints = computed(() => radarValuePoints.value.map(point => `${point.x},${point.y}`).join(' '))

function radarPoint(index: number, radius: number) {
  const angle = -Math.PI / 2 + index * Math.PI / 3
  return { x: 120 + Math.cos(angle) * radius, y: 120 + Math.sin(angle) * radius }
}

function radarLabelAnchor(x: number) {
  if (x > 130) return 'start'
  if (x < 110) return 'end'
  return 'middle'
}

function memberInitial(label: string) {
  return label.trim().slice(-2) || '学员'
}

function truncateLabel(label: string, maxLength = 8) {
  return label.length > maxLength ? `${label.slice(0, maxLength)}…` : label
}

async function loadAdminAchievements() {
  if (!isOwner.value) return
  adminLoading.value = true
  adminError.value = false
  try {
    adminAnalytics.value = await server.listMemberAchievementAnalytics(roomId.value)
  } catch {
    adminAnalytics.value = null
    adminError.value = true
  } finally {
    adminLoading.value = false
  }
}

onMounted(() => {
  void loadAdminAchievements()
})

watch(isOwner, (owner) => {
  if (owner) void loadAdminAchievements()
})
</script>
