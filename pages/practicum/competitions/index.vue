<template>
  <ClientOnly>
    <PracticumShell context-title="实训比赛" context-meta="发布比赛并管理个人参赛记录">
      <section class="competition-page" data-competition-page>
        <header class="page-heading competition-heading">
          <div>
            <p class="eyebrow">实战挑战</p>
            <h1>实训比赛</h1>
            <p>管理员在授权实训室创建和发布比赛；学生对每场已发布比赛只能确认参赛一次。</p>
          </div>
          <button v-if="isOwner" data-open-competition-form class="primary-button" type="button" :disabled="loading" @click="showCreate = !showCreate">
            新建比赛
          </button>
        </header>

        <form v-if="showCreate && isOwner" data-competition-form class="form-panel" @submit.prevent="createCompetition">
          <div class="form-grid">
            <label class="field">实训室
              <select v-model="newCompetition.roomId" required><option v-for="roomId in roomIds" :key="roomId" :value="roomId">{{ roomId }}</option></select>
            </label>
            <label class="field">比赛名称<input v-model.trim="newCompetition.title" maxlength="120" required></label>
          </div>
          <label class="field">比赛说明<textarea v-model.trim="newCompetition.description" rows="4" maxlength="2000" required></textarea></label>
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <div class="form-actions"><button data-create-competition class="primary-button" :disabled="saving" type="submit">{{ saving ? '创建中...' : '创建草稿' }}</button><button class="secondary-button" type="button" @click="showCreate = false">取消</button></div>
        </form>

        <p v-if="loading" data-competition-loading class="empty-state">正在加载比赛...</p>
        <section v-else-if="error" data-competition-error class="state-block" role="alert"><h2>比赛数据暂时无法加载</h2><p>请稍后重试。页面不会用本地数据代替服务端结果。</p><button class="secondary-button" type="button" @click="loadCompetitions">重试</button></section>
        <section v-else-if="!competitions.length" data-competition-empty class="state-block"><h2>当前没有可参加的比赛</h2><p>{{ isOwner ? '创建草稿并发布后，学生会在授权实训室内看到比赛。' : '等待管理员在当前实训室发布比赛。' }}</p></section>
        <div v-else data-competition-list class="competition-list">
          <article v-for="competition in competitions" :key="competition.id" data-competition-card class="competition-card">
            <div class="card-topline"><span class="status-pill" :class="`competition-${competition.status.toLowerCase()}`">{{ statusLabel(competition.status) }}</span><span class="meta">{{ competition.roomId }}</span></div>
            <div><h2>{{ competition.title }}</h2><p>{{ competition.description }}</p></div>
            <p class="meta">创建于 {{ formatTime(competition.createdAt) }}</p>

            <div v-if="isOwner" class="card-actions">
              <button v-if="competition.status === 'DRAFT'" data-publish-competition class="secondary-button" type="button" :disabled="saving" @click="transitionCompetition(competition.id, 'publish')">发布比赛</button>
              <button v-else-if="competition.status === 'PUBLISHED'" data-close-competition class="danger-button" type="button" :disabled="saving" @click="transitionCompetition(competition.id, 'close')">关闭比赛</button>
            </div>

            <section v-else-if="competition.myEntry" data-competition-entry class="entry-summary"><strong>已确认参赛</strong><p>你的参赛记录已由服务端保存，不能重复提交。</p><small>{{ formatTime(competition.myEntry.submittedAt ?? competition.myEntry.registeredAt) }}</small></section>
            <div v-else-if="competition.status === 'PUBLISHED'" data-competition-entry-form class="entry-form">
              <p>确认后会在当前实训室创建一条个人参赛记录，不能重复提交。</p>
              <button data-enter-competition class="primary-button" type="button" :disabled="saving" @click="enterCompetition(competition.id)">确认参赛</button>
            </div>
          </article>
        </div>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

type CompetitionStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
interface CompetitionEntry { registeredAt: string; submittedAt?: string }
interface CompetitionItem { id: string; roomId: string; title: string; description: string; status: CompetitionStatus; createdAt: string; myEntry: CompetitionEntry | null }

const auth = useAuthSession()
const competitions = ref<CompetitionItem[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref(false)
const formError = ref('')
const showCreate = ref(false)
const roomIds = computed(() => auth.state.value.user?.roomIds ?? [])
const isOwner = computed(() => auth.state.value.user?.role === 'OWNER')
const newCompetition = reactive({ roomId: '', title: '', description: '' })

onMounted(async () => { await auth.load(); newCompetition.roomId = roomIds.value[0] ?? ''; await loadCompetitions() })

async function loadCompetitions() {
  loading.value = true
  error.value = false
  try {
    const result = await $fetch<{ items: CompetitionItem[] }>('/api/practicum/competitions')
    competitions.value = result.items
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function createCompetition() {
  if (!isOwner.value || saving.value) return
  saving.value = true
  formError.value = ''
  try {
    await $fetch('/api/practicum/competitions', { method: 'POST', headers: useCsrfHeaders({ 'Idempotency-Key': `competition-ui-${Date.now()}` }), body: newCompetition })
    newCompetition.title = ''; newCompetition.description = ''; showCreate.value = false
    await loadCompetitions()
  } catch {
    formError.value = '比赛创建失败，请检查实训室、名称和说明后重试。'
  } finally {
    saving.value = false
  }
}

async function transitionCompetition(id: string, action: 'publish' | 'close') {
  if (!isOwner.value || saving.value) return
  saving.value = true
  try {
    await $fetch(`/api/practicum/competitions/${id}/${action}`, { method: 'POST', headers: useCsrfHeaders() })
    await loadCompetitions()
  } catch {
    error.value = true
  } finally {
    saving.value = false
  }
}

async function enterCompetition(id: string) {
  if (saving.value) return
  saving.value = true
  try {
    await $fetch(`/api/practicum/competitions/${id}/entries`, { method: 'POST', headers: useCsrfHeaders() })
    await loadCompetitions()
  } catch {
    error.value = true
  } finally {
    saving.value = false
  }
}

function statusLabel(status: CompetitionStatus) { return status === 'DRAFT' ? '草稿' : status === 'PUBLISHED' ? '进行中' : '已关闭' }
function formatTime(value: string) { return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
</script>

<style scoped>
.competition-page { display: grid; gap: 18px; max-width: 1120px; margin: 0 auto; padding: 24px; }
.competition-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
.competition-heading h1, .competition-card h2, .state-block h2 { margin: 0; }
.competition-heading p:last-child, .competition-card p, .state-block p { color: var(--practicum-muted); }
.competition-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.competition-card, .state-block, .entry-summary, .entry-form { display: grid; gap: 14px; }
.competition-card, .state-block { padding: 18px; border: 1px solid var(--practicum-border); border-radius: var(--practicum-radius-sm); background: #fff; box-shadow: var(--practicum-shadow-1); }
.card-topline, .card-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.meta { color: var(--practicum-muted); font-size: 13px; }
.entry-summary, .entry-form { padding: 14px; background: var(--practicum-paper); border-radius: var(--practicum-radius-sm); }
.entry-summary p { margin: 0; overflow-wrap: anywhere; }
.competition-draft { color: #8a4b08; background: #fff4d6; }.competition-published { color: #0f766e; background: #e7f7f4; }.competition-closed { color: #9a3412; background: #fff1e8; }
@media (max-width: 640px) { .competition-page { padding: 16px; } .competition-heading { align-items: flex-start; flex-direction: column; } .competition-list { grid-template-columns: 1fr; } }
</style>
