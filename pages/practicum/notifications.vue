<template>
  <ClientOnly>
    <PracticumShell context-title="消息通知" context-meta="查看提醒，发布课程动态">
      <div data-notifications-page>
        <section v-if="store.state.activeRole === 'OWNER'" class="form-panel compose-panel" data-notification-compose-panel>
          <div class="panel-heading"><div><h2>发布通知</h2><p class="muted">通知会发送给当前训练室的学生。</p></div></div>
          <form @submit.prevent="sendNotification">
            <label class="field">通知标题<input v-model.trim="composeTitle" data-notification-compose maxlength="120" required></label>
            <label class="field">通知内容<textarea v-model.trim="composeMessage" data-notification-message maxlength="2000" rows="4" required></textarea></label>
            <label class="field">跳转入口<select v-model="composeRoute"><option value="/practicum/tasks">我的任务</option><option value="/practicum/courses">课程大厅</option><option value="/practicum/tutorials">教程中心</option></select></label>
            <p v-if="composeError" class="form-error" role="alert">{{ composeError }}</p>
            <p v-if="composeSuccess" class="success-state" role="status">{{ composeSuccess }}</p>
            <button data-notification-send class="primary-button" type="submit" :disabled="sending">{{ sending ? '发送中…' : '发送通知' }}</button>
          </form>
        </section>

        <div v-if="isLoading" data-loading class="empty-state">正在加载通知…</div>
        <PracticumStatePanel v-else-if="loadError" data-notifications-error state="error" title="通知加载失败" description="服务端暂时不可用，请重新加载。" @retry="loadNotifications" />
        <template v-else>
          <div v-if="roleNotifications.length" data-notification-history class="notification-list">
            <div v-if="roleNotifications.some(n => !n.read)" class="notification-actions">
              <button data-mark-all-read class="text-link" type="button" @click="handleMarkAllRead">全部标记为已读（{{ unreadCount }} 条）</button>
            </div>
            <article v-for="notification in roleNotifications" :key="notification.id" :data-notification-item="notification.id" :class="['form-panel', 'notification-row', { 'notification-unread': !notification.read }]">
              <div class="notification-meta"><span class="status-pill" :class="notification.read ? '' : 'status-pill-orange'">{{ notification.read ? '已读' : '未读' }}</span><span class="meta">{{ formatTime(notification.createdAt) }}</span></div>
              <p><strong>{{ notification.title }}</strong></p>
              <p>{{ notification.message }}</p>
              <div class="notification-actions">
                <NuxtLink v-if="store.canAccessNotificationRoute(store.state.activeRole!, notification.targetRoute)" :to="notification.targetRoute" data-notification-link class="text-link">查看详情</NuxtLink>
                <button v-if="!notification.read" :data-mark-read="notification.id" type="button" class="text-link" @click="markRead(notification)">标记已读</button>
              </div>
            </article>
          </div>
          <p v-else data-empty class="empty-state">暂无通知。</p>
        </template>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { PracticumNotification } from '~/domain/practicum/types'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { usePracticumServer } from '~/composables/usePracticumServer'

const store = usePracticumStore()
const server = usePracticumServer()
const isLoading = ref(true)
const loadError = ref(false)
const serverNotifications = ref<PracticumNotification[] | null>(null)
const composeTitle = ref('')
const composeMessage = ref('')
const composeRoute = ref('/practicum/tasks')
const sending = ref(false)
const composeError = ref('')
const composeSuccess = ref('')

const roleNotifications = computed(() => {
  if (!store.state.activeRole) return []
  return serverNotifications.value ?? []
})
const unreadCount = computed(() => roleNotifications.value.filter(notification => !notification.read).length)

onMounted(loadNotifications)

async function loadNotifications() {
  isLoading.value = true
  loadError.value = false
  try {
    const response = await server.listNotifications()
    serverNotifications.value = response.items
  } catch {
    serverNotifications.value = []
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

async function sendNotification() {
  if (sending.value || !composeTitle.value || !composeMessage.value) return
  sending.value = true
  composeError.value = ''
  composeSuccess.value = ''
  try {
    await $fetch('/api/practicum/notifications', {
      method: 'POST',
      headers: useCsrfHeaders({ 'Idempotency-Key': `notification-${crypto.randomUUID()}` }),
      body: { title: composeTitle.value, message: composeMessage.value, targetRole: 'STUDENT', targetRoute: composeRoute.value },
    })
    composeSuccess.value = '通知已发送，学生刷新页面后即可看到。'
    composeTitle.value = ''
    composeMessage.value = ''
    await loadNotifications()
  } catch {
    composeError.value = '发送失败，请检查内容后重试。'
  } finally {
    sending.value = false
  }
}

async function markRead(notification: PracticumNotification) {
  try {
    await server.markNotificationRead(notification.id)
    notification.read = true
  } catch {
    await loadNotifications()
  }
}

async function handleMarkAllRead() {
  for (const notification of roleNotifications.value.filter(item => !item.read)) await markRead(notification)
}

function formatTime(iso: string) {
  const date = new Date(iso)
  return date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.compose-panel { margin-bottom: 16px; }
.panel-heading { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.notification-list { display: flex; flex-direction: column; gap: 8px; }
.notification-row { display: flex; flex-direction: column; gap: 4px; }
.notification-unread { border-inline-start: 3px solid var(--practicum-orange); }
.notification-meta, .notification-actions { display: flex; align-items: center; gap: 10px; }
.notification-actions { margin-top: 4px; }
.success-state { color: #137333; margin: 8px 0; }
</style>
