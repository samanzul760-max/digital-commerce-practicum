<template>
  <ClientOnly>
    <PracticumShell context-title="教学案例" context-meta="电商任务案例库">
      <p v-if="!store.state.activeRole" data-role-entry class="empty-state">请先到个人页选择身份，再查看教学案例。</p>

      <section v-else data-commerce-cases class="case-library">
        <div class="page-heading case-library-heading">
          <div class="case-library-copy">
            <p class="eyebrow">教学案例库</p>
            <h1>电商教学案例</h1>
            <p>六个原创匿名案例，覆盖商品发布、营销活动、交易处理、客服沟通和数据复盘。三个案例可直接提交，其余案例用于课堂阅读和自检。</p>
          </div>

          <div data-case-summary-band class="case-summary-band" aria-label="案例概览">
            <div class="summary-tile">
              <span class="summary-label">总案例</span>
              <strong>{{ cases.length }}</strong>
              <small>保持同一套课堂素材</small>
            </div>
            <div data-case-submit-count class="summary-tile">
              <span class="summary-label">可提交</span>
              <strong>{{ submittableCount }}</strong>
              <small>沿用本地提交版本流</small>
            </div>
            <div class="summary-tile">
              <span class="summary-label">课堂阅读</span>
              <strong>{{ readOnlyCount }}</strong>
              <small>适合讲解与自检</small>
            </div>
          </div>
        </div>

        <div class="case-brief-grid">
          <article class="case-brief">
            <p class="eyebrow">学习体验</p>
            <h2>先看场景，再看动作</h2>
            <p>每个案例都先交代业务背景，再给出任务、自检和示例，学生打开就能知道该做什么。</p>
          </article>
          <article class="case-brief">
            <p class="eyebrow">双角色视角</p>
            <h2>同一案例，两种角色</h2>
            <p>学生只看学习内容和提交区，管理者在详情页看到教学目标、课堂建议、常见错误和量规。</p>
          </article>
          <article class="case-brief">
            <p class="eyebrow">提交闭环</p>
            <h2>延续本地提交流程</h2>
            <p>可提交案例直接复用现有草稿、版本、退回和评分流，不新增第二套提交体系。</p>
          </article>
        </div>

        <section v-if="store.state.activeRole === 'OWNER' || store.state.activeRole === 'STUDENT'" data-case-operations class="case-operations">
          <NuxtLink v-if="store.state.activeRole === 'OWNER'" to="/practicum/templates" data-open-practicum-templates class="secondary-button">管理实训模板</NuxtLink>
          <NuxtLink to="/practicum/competitions" data-open-practicum-competitions class="secondary-button">进入实训比赛</NuxtLink>
        </section>

        <section data-case-group="submittable" class="case-group">
          <div class="case-group-heading">
            <div>
              <p class="eyebrow">可提交练习</p>
              <h2>需要交付结果的案例</h2>
            </div>
            <span class="status-pill">{{ submittableCount }} 个</span>
          </div>

          <div class="case-grid">
            <article v-for="item in submittableCases" :key="item.id" data-case-card class="case-card">
              <div class="case-card-top">
                <span class="status-pill">{{ item.category }}</span>
                <span class="status-pill">可提交</span>
              </div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.summary }}</p>
              <dl class="case-card-meta">
                <div>
                  <dt>步骤</dt>
                  <dd>{{ item.steps.length }}</dd>
                </div>
                <div>
                  <dt>自检</dt>
                  <dd>{{ item.selfCheckItems.length }}</dd>
                </div>
              </dl>
              <NuxtLink :to="`/practicum/cases/${item.id}`" class="text-link">打开案例</NuxtLink>
            </article>
          </div>
        </section>

        <section data-case-group="read-only" class="case-group">
          <div class="case-group-heading">
            <div>
              <p class="eyebrow">课堂阅读</p>
              <h2>用于讲解和自检的案例</h2>
            </div>
            <span class="status-pill status-pill-orange">{{ readOnlyCount }} 个</span>
          </div>

          <div class="case-grid">
            <article v-for="item in readOnlyCases" :key="item.id" data-case-card class="case-card">
              <div class="case-card-top">
                <span class="status-pill">{{ item.category }}</span>
                <span class="status-pill status-pill-orange">自检案例</span>
              </div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.summary }}</p>
              <dl class="case-card-meta">
                <div>
                  <dt>步骤</dt>
                  <dd>{{ item.steps.length }}</dd>
                </div>
                <div>
                  <dt>自检</dt>
                  <dd>{{ item.selfCheckItems.length }}</dd>
                </div>
              </dl>
              <NuxtLink :to="`/practicum/cases/${item.id}`" class="text-link">打开案例</NuxtLink>
            </article>
          </div>
        </section>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { commerceCases } from '../../../data/practicum/commerce-case-seed'
import { usePracticumStore } from '../../../composables/usePracticumStore'

const store = usePracticumStore()
const cases = commerceCases
const submittableCases = computed(() => cases.filter(item => item.submissionMode === 'SUBMITTABLE'))
const readOnlyCases = computed(() => cases.filter(item => item.submissionMode === 'READ_ONLY'))
const submittableCount = computed(() => submittableCases.value.length)
const readOnlyCount = computed(() => readOnlyCases.value.length)
</script>

<style scoped>
.case-library {
  display: grid;
  gap: 18px;
}

.case-library-heading {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
  gap: 18px;
  align-items: stretch;
}

.case-library-copy {
  display: grid;
  gap: 10px;
}

.case-summary-band {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.summary-tile {
  display: grid;
  gap: 6px;
  align-content: start;
  min-height: 118px;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--practicum-border);
  border-radius: var(--practicum-radius-sm);
  box-shadow: var(--practicum-shadow-1);
}

.summary-label {
  color: var(--practicum-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.summary-tile strong {
  font-size: 30px;
  line-height: 1;
  color: var(--practicum-ink);
}

.summary-tile small {
  color: var(--practicum-muted);
}

.case-brief-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.case-operations {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.case-brief,
.case-group {
  display: grid;
  gap: 12px;
}

.case-brief {
  padding: 16px;
  background: var(--practicum-surface);
  border: 1px solid var(--practicum-border);
  border-radius: var(--practicum-radius-sm);
}

.case-brief h2,
.case-group-heading h2 {
  margin: 0;
  font-size: 18px;
}

.case-brief p:last-child {
  color: var(--practicum-muted);
}

.case-group-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.case-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.case-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--practicum-border);
  border-radius: var(--practicum-radius-sm);
  box-shadow: var(--practicum-shadow-1);
}

.case-card-top {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.case-card strong {
  font-size: 18px;
  color: var(--practicum-ink);
}

.case-card p {
  color: var(--practicum-muted);
}

.case-card-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
  margin: 0;
  background: var(--practicum-paper);
  border-radius: var(--practicum-radius-sm);
}

.case-card-meta div {
  display: grid;
  gap: 4px;
}

.case-card-meta dt {
  color: var(--practicum-muted);
  font-size: 12px;
  font-weight: 700;
}

.case-card-meta dd {
  margin: 0;
  color: var(--practicum-ink);
  font-weight: 700;
}

@media (max-width: 1180px) {
  .case-library-heading,
  .case-brief-grid,
  .case-grid,
  .case-summary-band {
    grid-template-columns: 1fr;
  }
}
</style>
