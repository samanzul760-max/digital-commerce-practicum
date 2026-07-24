<template>
  <ClientOnly>
    <PracticumShell context-title="消息通知" context-meta="">
      <p v-if="isLoading" data-loading class="empty-state">正在加载通知...</p>

      <div v-else data-notifications-page>
        <div v-if="roleNotifications.length" class="notification-actions">
          <button
            v-if="roleNotifications.some(n => !n.read)"
            data-mark-all-read
            class="text-link"
            type="button"
            @click="handleMarkAllRead"
          >
            全部标记为已读（{{ unreadCount }} 条未读）
          </button>
        </div>

        <div v-if="roleNotifications.length" class="notification-list">
          <div
            v-for="n in roleNotifications"
            :key="n.id"
            :data-notification-item="n.id"
            :data-notification-type="n.type"
            :class="['form-panel', 'notification-row', { 'notification-unread': !n.read }]"
          >
            <div class="notification-meta">
              <span class="status-pill" :class="n.read ? '' : 'status-pill-orange'">{{ n.read ? '已读' : '未读' }}</span>
              <span class="meta">{{ formatTime(n.createdAt) }}</span>
            </div>
            <p><strong>{{ n.title }}</strong></p>
            <p>{{ n.message }}</p>
            <div class="notification-actions">
              <NuxtLink
                v-if="store.canAccessNotificationRoute(store.state.activeRole!, n.targetRoute)"
                :to="n.targetRoute"
                data-notification-link
                class="text-link"
              >
                查看详情
              </NuxtLink>
              <span v-else data-destination-error class="meta" style="color: var(--practicum-muted);">目标页面无法访问</span>
              <button
                v-if="!n.read"
                :data-mark-read="n.id"
                type="button"
                class="text-link"
                @click="store.markNotificationRead(n.id)"
              >
                标记已读
              </button>
            </div>
          </div>
        </div>

        <p v-else data-empty class="empty-state">暂无通知。</p>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { usePracticumStore } from '../../composables/usePracticumStore'

const store = usePracticumStore()
const isLoading = ref(true)

onMounted(() => {
  isLoading.value = false
})

const roleNotifications = computed(() => {
  if (!store.state.activeRole) return []
  return store.notificationsForRole(store.state.activeRole)
})

const unreadCount = computed(() => roleNotifications.value.filter(n => !n.read).length)

function handleMarkAllRead() {
  const count = unreadCount.value
  if (count === 0) return
  // Mark only current role's notifications as read
  for (const n of roleNotifications.value) {
    if (!n.read) store.markNotificationRead(n.id)
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.notification-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.notification-unread {
  border-inline-start: 3px solid var(--practicum-orange);
}
.notification-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.notification-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}
.notification-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
