<template>
  <ClientOnly>
    <PracticumShell context-title="成就" context-meta="查看技能成长、勋章进度与奖励记录">
      <PracticumStatePanel v-if="store.state.activeRole !== 'STUDENT'" state="forbidden" title="成就仅向学生视图开放" description="切换到学生身份后可查看个人学习成就。" />
      <main v-else class="achievements-page" data-achievements-page>
        <section class="achievement-overview" data-achievement-overview>
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
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { achievementBadges, achievementOverview, achievementTimeline, skillMatrix } from '~/data/practicum/achievement-catalog'

const store = usePracticumStore()
const overview = achievementOverview
const skills = skillMatrix
const timeline = achievementTimeline
const activeTab = ref<'all' | 'unlocked' | 'pending'>('all')
const tabs = [{ id: 'all' as const, label: '全部勋章' }, { id: 'unlocked' as const, label: '已解锁' }, { id: 'pending' as const, label: '进行中 / 未解锁' }]
const filteredBadges = computed(() => activeTab.value === 'all' ? achievementBadges : activeTab.value === 'unlocked' ? achievementBadges.filter(item => item.state === 'unlocked') : achievementBadges.filter(item => item.state !== 'unlocked'))
</script>
