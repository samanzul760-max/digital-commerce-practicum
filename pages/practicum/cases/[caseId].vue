<template>
  <ClientOnly>
    <PracticumShell :context-title="caseItem?.title ?? '案例未找到'" context-meta="教学案例">
      <p v-if="!store.state.activeRole" data-role-entry class="empty-state">请先到个人页选择身份，再查看教学案例。</p>

      <div v-else-if="!caseItem" data-case-missing class="empty-state">
        <h1>案例未找到</h1>
        <p>当前案例不存在，可能已被移除或地址输入有误。</p>
        <NuxtLink to="/practicum/cases" class="text-link">返回教学案例</NuxtLink>
      </div>

      <div v-else data-case-detail class="case-detail">
        <section data-case-hero class="case-hero">
          <div class="case-hero-copy">
            <NuxtLink to="/practicum/cases" class="text-link">返回案例列表</NuxtLink>
            <p class="eyebrow">{{ caseItem.category }}</p>
            <h1>{{ caseItem.title }}</h1>
            <p>{{ caseItem.summary }}</p>
            <p class="case-scenario">{{ caseItem.scenario }}</p>
          </div>

          <aside data-case-briefing class="case-briefing" aria-label="案例总览">
            <div class="case-briefing-row">
              <span class="summary-label">案例类型</span>
              <strong>{{ caseItem.category }}</strong>
            </div>
            <div class="case-briefing-row">
              <span class="summary-label">提交方式</span>
              <strong>{{ caseItem.submissionMode === 'SUBMITTABLE' ? '可提交练习' : '课堂阅读' }}</strong>
            </div>
            <div class="case-briefing-row">
              <span class="summary-label">学习步骤</span>
              <strong>{{ caseItem.steps.length }}</strong>
            </div>
            <div class="case-briefing-row">
              <span class="summary-label">自检项</span>
              <strong>{{ caseItem.selfCheckItems.length }}</strong>
            </div>
            <div v-if="caseItem.submissionMode === 'SUBMITTABLE'" class="case-briefing-row">
              <span class="summary-label">已提交版本</span>
              <strong>{{ versions.length }}</strong>
            </div>
            <div v-else class="case-briefing-row">
              <span class="summary-label">课堂用途</span>
              <strong>讲解 / 自检</strong>
            </div>
          </aside>
        </section>

        <div class="case-layout">
          <div class="case-main">
            <section data-student-case-content class="case-panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">学习内容</p>
                  <h2>先理解场景，再开始动手</h2>
                </div>
              </div>
              <div class="case-content-grid">
                <article>
                  <h3>业务背景</h3>
                  <p>{{ caseItem.scenario }}</p>
                </article>
                <article>
                  <h3>学生任务</h3>
                  <p>{{ caseItem.studentTask }}</p>
                </article>
                <article>
                  <h3>完成步骤</h3>
                  <ol>
                    <li v-for="step in caseItem.steps" :key="step">{{ step }}</li>
                  </ol>
                </article>
                <article>
                  <h3>参考示例</h3>
                  <p>{{ caseItem.example }}</p>
                </article>
              </div>
            </section>

            <section data-case-self-check class="case-panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">自检</p>
                  <h2>提交前先核对这三项</h2>
                </div>
              </div>
              <div class="case-checklist">
                <label v-for="item in caseItem.selfCheckItems" :key="item" class="check-row">
                  <input type="checkbox">
                  <span>{{ item }}</span>
                </label>
              </div>
            </section>

            <section v-if="caseItem.submissionMode === 'SUBMITTABLE' && store.state.activeRole === 'STUDENT'" data-case-submission class="case-panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">提交</p>
                  <h2>保存草稿，再确认提交</h2>
                </div>
              </div>
              <p v-if="status !== 'NOT_STARTED'" data-case-status class="status-pill" :class="status === 'RETURNED' ? 'status-pill-orange' : ''">{{ statusLabel }}</p>
              <p v-if="feedback" data-case-feedback class="empty-state">退回反馈：{{ feedback }}</p>
              <label class="field">案例成果
                <textarea data-case-draft v-model="draft" rows="6" placeholder="输入你的案例作答"></textarea>
              </label>
              <p v-if="draftSaved" data-case-draft-saved class="status-pill">草稿已保存</p>
              <div class="form-actions">
                <button data-save-case-draft class="secondary-button" type="button" @click="saveDraft">保存草稿</button>
                <button data-submit-case class="primary-button" type="button" @click="showSubmitConfirm = true">提交成果</button>
              </div>
              <div v-if="showSubmitConfirm" class="case-confirm">
                <p>提交后会创建一个不可变版本，并进入管理者审核视图。</p>
                <div class="form-actions">
                  <button data-confirm-submit-case class="primary-button" type="button" @click="submitWork">确认提交</button>
                  <button class="secondary-button" type="button" @click="showSubmitConfirm = false">取消</button>
                </div>
              </div>
              <div v-if="versions.length" class="case-versions">
                <article v-for="version in versions" :key="version.id" data-case-version class="plan-row">
                  <div><strong>版本 {{ version.version }}</strong><span>{{ version.text }}</span></div>
                  <time class="meta">{{ version.submittedAt }}</time>
                </article>
              </div>
            </section>

            <section v-if="caseItem.submissionMode === 'READ_ONLY'" class="case-panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">课堂阅读</p>
                  <h2>这个案例用于讲解和自检，不需要提交</h2>
                </div>
              </div>
              <p>你可以把它当作课堂讨论材料，或者根据自检项整理自己的判断。</p>
            </section>
          </div>

          <aside class="case-rail">
            <section v-if="store.state.activeRole === 'STUDENT'" class="case-panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">学习提示</p>
                  <h2>先完成，再提交</h2>
                </div>
              </div>
              <ul class="case-bullet-list">
                <li>先读场景，再看任务和示例。</li>
                <li>对照自检项检查是否写全。</li>
                <li>可提交案例先存草稿，再确认提交。</li>
              </ul>
            </section>

            <section v-if="store.state.activeRole === 'OWNER'" data-owner-case-guidance class="case-panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">教学指导</p>
                  <h2>给管理者看的讲解材料</h2>
                </div>
              </div>
              <h3>学习目标</h3>
              <ul class="case-bullet-list">
                <li v-for="goal in caseItem.learningObjectives" :key="goal">{{ goal }}</li>
              </ul>
              <h3>课堂建议</h3>
              <ul class="case-bullet-list">
                <li v-for="tip in caseItem.classroomTips" :key="tip">{{ tip }}</li>
              </ul>
              <h3>讲解重点</h3>
              <ul class="case-bullet-list">
                <li v-for="item in caseItem.ownerGuidance" :key="item">{{ item }}</li>
              </ul>
              <h3>常见错误</h3>
              <ul class="case-bullet-list">
                <li v-for="mistake in caseItem.commonMistakes" :key="mistake">{{ mistake }}</li>
              </ul>
            </section>

            <section v-if="store.state.activeRole === 'OWNER' && caseItem.submissionMode === 'SUBMITTABLE'" data-owner-case-rubric class="case-panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">量规</p>
                  <h2>提交后如何查看</h2>
                </div>
              </div>
              <table class="data-table">
                <thead>
                  <tr><th>维度</th><th>满分</th><th>要求</th></tr>
                </thead>
                <tbody>
                  <tr v-for="item in caseItem.rubric" :key="item.id">
                    <td>{{ item.label }}</td>
                    <td>{{ item.maxScore }}</td>
                    <td>{{ item.required ? '必评' : '选评' }}</td>
                  </tr>
                </tbody>
              </table>
              <p data-case-submission-overview class="status-pill">已提交 {{ versions.length }} 个版本</p>
            </section>
          </aside>
        </div>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { commerceCases } from '../../../data/practicum/commerce-case-seed'
import { usePracticumStore } from '../../../composables/usePracticumStore'

const route = useRoute()
const store = usePracticumStore()
const caseId = computed(() => route.params.caseId as string)
const caseItem = computed(() => commerceCases.find(item => item.id === caseId.value) ?? null)
const nodeId = computed(() => caseItem.value?.submissionNodeId ?? '')
const draft = ref('')
const draftSaved = ref(false)
const showSubmitConfirm = ref(false)
const submission = computed(() => nodeId.value ? store.state.practiceSubmissions[nodeId.value] : null)
const versions = computed(() => submission.value?.versions ?? [])
const status = computed(() => submission.value?.status ?? 'NOT_STARTED')
const feedback = computed(() => submission.value?.feedback ?? '')
const statusLabel = computed(() => status.value === 'RETURNED' ? '已退回' : status.value === 'GRADED' ? '已评分' : '已提交')

watch(nodeId, (value) => {
  draft.value = value ? store.state.practiceDrafts[value] ?? '' : ''
}, { immediate: true })

function saveDraft() {
  if (!caseItem.value) return
  draftSaved.value = store.saveCaseDraft(caseItem.value.id, draft.value)
  setTimeout(() => { draftSaved.value = false }, 2000)
}

function submitWork() {
  if (!caseItem.value || !draft.value.trim()) return
  store.saveCaseDraft(caseItem.value.id, draft.value)
  store.submitCaseWork(caseItem.value.id)
  showSubmitConfirm.value = false
}
</script>

<style scoped>
.case-detail {
  display: grid;
  gap: 16px;
}

.case-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 16px;
  align-items: stretch;
  padding: 18px;
  background: #fff;
  border: 1px solid var(--practicum-border);
  border-radius: var(--practicum-radius-md);
  box-shadow: var(--practicum-shadow-1);
}

.case-hero-copy {
  display: grid;
  gap: 10px;
}

.case-scenario {
  padding: 14px;
  color: var(--practicum-ink-soft);
  background: var(--practicum-teal-soft);
  border-radius: var(--practicum-radius-sm);
}

.case-briefing {
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 14px;
  background: var(--practicum-paper);
  border-radius: var(--practicum-radius-sm);
}

.case-briefing-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}

.case-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 16px;
  align-items: start;
}

.case-main,
.case-rail {
  display: grid;
  gap: 16px;
}

.case-panel {
  display: grid;
  gap: 12px;
  padding: 18px;
  background: #fff;
  border: 1px solid var(--practicum-border);
  border-radius: var(--practicum-radius-md);
  box-shadow: var(--practicum-shadow-1);
}

.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: end;
}

.section-heading h2 {
  margin: 0;
  font-size: 18px;
}

.case-content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.case-content-grid article {
  padding: 14px;
  background: var(--practicum-paper);
  border-radius: var(--practicum-radius-sm);
}

.case-content-grid h3,
.case-panel h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

.case-content-grid p,
.case-panel p {
  color: var(--practicum-ink-soft);
}

.case-checklist,
.case-bullet-list {
  display: grid;
  gap: 10px;
}

.case-bullet-list {
  margin: 0;
  padding-left: 18px;
  color: var(--practicum-ink-soft);
}

.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
}

.check-row input {
  width: 22px;
  height: 22px;
}

.case-confirm {
  display: grid;
  gap: 10px;
  padding: 14px;
  background: var(--practicum-paper);
  border-radius: var(--practicum-radius-sm);
}

.case-versions {
  display: grid;
  gap: 10px;
}

@media (max-width: 1180px) {
  .case-hero,
  .case-layout,
  .case-content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
