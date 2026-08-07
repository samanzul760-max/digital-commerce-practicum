<template>
  <ClientOnly>
    <PracticumShell context-title="实训模板" context-meta="按实训室控制案例入口">
      <section class="template-page" data-template-page>
        <header class="page-heading template-heading">
          <div>
            <p class="eyebrow">教学配置</p>
            <h1>实训模板</h1>
            <p>模板开关由服务端按当前会话和实训室生效，案例内容不会复制到浏览器业务状态中。</p>
          </div>
        </header>

        <p v-if="loading" data-template-loading class="empty-state">正在加载实训模板...</p>
        <section v-else-if="forbidden" data-template-forbidden class="state-block" role="alert">
          <h2>此模板当前不可访问</h2>
          <p>模板已关闭，或你没有访问该实训室的权限。</p>
        </section>
        <section v-else-if="error" data-template-error class="state-block" role="alert">
          <h2>模板数据暂时无法加载</h2>
          <p>请稍后重试。页面不会使用本地缓存替代服务端数据。</p>
          <button class="secondary-button" type="button" @click="loadTemplates">重试</button>
        </section>
        <section v-else-if="!templates.length" data-template-empty class="state-block">
          <h2>当前实训室没有可用模板</h2>
          <p>管理员启用模板后，课程内容会在这里出现。</p>
        </section>
        <div v-else data-template-list class="template-grid">
          <article v-for="item in templates" :key="item.id" data-template-card class="template-card">
            <div class="card-topline">
              <span class="status-pill" :class="item.enabled ? 'status-enabled' : 'status-disabled'">{{ item.enabled ? '已启用' : '已关闭' }}</span>
              <span class="meta">{{ item.caseCount }} 个案例</span>
            </div>
            <div>
              <h2>{{ item.title }}</h2>
              <p>{{ item.description }}</p>
            </div>
            <dl>
              <div><dt>适用实训室</dt><dd>{{ item.roomId }}</dd></div>
              <div><dt>最近更新</dt><dd>{{ formatTime(item.updatedAt) }}</dd></div>
            </dl>
            <div v-if="isOwner" class="card-actions">
              <button data-template-toggle class="secondary-button" type="button" :disabled="savingId === item.id" @click="toggleTemplate(item)">
                {{ savingId === item.id ? '保存中...' : item.enabled ? '关闭模板' : '启用模板' }}
              </button>
            </div>
          </article>
        </div>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

interface TemplateItem {
  id: string
  roomId: string
  title: string
  description: string
  enabled: boolean
  caseCount: number
  updatedAt: string
}

const route = useRoute()
const auth = useAuthSession()
const templates = ref<TemplateItem[]>([])
const loading = ref(true)
const error = ref(false)
const forbidden = ref(false)
const savingId = ref<string | null>(null)
const isOwner = computed(() => auth.state.value.user?.role === 'OWNER')

onMounted(() => void loadTemplates())

async function loadTemplates() {
  loading.value = true
  error.value = false
  forbidden.value = false
  try {
    await auth.load()
    const result = await $fetch<{ items: TemplateItem[] }>('/api/practicum/templates')
    templates.value = result.items
    const requestedId = typeof route.query.templateId === 'string' ? route.query.templateId : ''
    if (requestedId) await $fetch(`/api/practicum/templates/${requestedId}`)
  } catch (requestError: unknown) {
    const statusCode = (requestError as { statusCode?: number })?.statusCode
    forbidden.value = statusCode === 403
    error.value = !forbidden.value
  } finally {
    loading.value = false
  }
}

async function toggleTemplate(item: TemplateItem) {
  if (!isOwner.value || savingId.value) return
  savingId.value = item.id
  error.value = false
  try {
    const result = await $fetch<{ template: TemplateItem }>(`/api/practicum/templates/${item.id}`, {
      method: 'PATCH',
      headers: useCsrfHeaders(),
      body: { enabled: !item.enabled },
    })
    templates.value = templates.value.map(template => template.id === item.id ? result.template : template)
  } catch {
    error.value = true
  } finally {
    savingId.value = null
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
</script>

<style scoped>
.template-page { display: grid; gap: 18px; max-width: 1120px; margin: 0 auto; padding: 24px; }
.template-heading { display: grid; gap: 8px; }
.template-heading h1, .template-card h2, .state-block h2 { margin: 0; }
.template-heading p:last-child, .template-card p, .state-block p { color: var(--practicum-muted); }
.template-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.template-card, .state-block { display: grid; gap: 16px; padding: 18px; border: 1px solid var(--practicum-border); border-radius: var(--practicum-radius-sm); background: #fff; box-shadow: var(--practicum-shadow-1); }
.card-topline, .card-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.template-card dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 12px; background: var(--practicum-paper); border-radius: var(--practicum-radius-sm); }
.template-card dl div { display: grid; gap: 4px; min-width: 0; }
.template-card dt, .meta { color: var(--practicum-muted); font-size: 12px; }
.template-card dd { margin: 0; overflow-wrap: anywhere; font-weight: 700; }
.status-enabled { color: #0f766e; background: #e7f7f4; }
.status-disabled { color: #9a3412; background: #fff1e8; }
@media (max-width: 640px) { .template-page { padding: 16px; } .template-grid { grid-template-columns: 1fr; } .template-card dl { grid-template-columns: 1fr; } }
</style>
