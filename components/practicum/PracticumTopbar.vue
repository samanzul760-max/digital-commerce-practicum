<template>
  <header data-practicum-topbar class="workspace-topbar">
    <div class="context-title">
      <strong data-context-label>{{ contextTitle }}</strong>
      <span>{{ contextMeta }}</span>
    </div>

    <div class="topbar-actions">
      <div class="notification-wrapper">
        <button
          class="icon-button"
          data-notification-btn
          aria-label="消息通知"
          aria-haspopup="true"
          :aria-expanded="notificationOpen"
          type="button"
          @click="toggleNotification"
        >
          <PracticumIcon name="bell" />
          <span v-if="unreadCount" data-notification-badge class="notification-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </button>
        <div v-if="notificationOpen" data-notification-dropdown class="topbar-dropdown notification-dropdown" role="menu">
          <div class="dropdown-header">
            <div>
              <strong data-dropdown-title>消息通知</strong>
              <span>查看近期消息和提醒</span>
            </div>
            <button v-if="unreadCount" data-mark-all-read type="button" class="text-link compact-link" @click="handleMarkAllRead">全部已读</button>
          </div>
          <ul v-if="recentNotifications.length" class="dropdown-list">
            <li
              v-for="n in recentNotifications"
              :key="n.id"
              :class="['dropdown-item', { 'dropdown-item-unread': !n.read }]"
              role="menuitem"
            >
              <NuxtLink
                v-if="canAccess(n)"
                :to="n.targetRoute"
                class="dropdown-link"
                @click="notificationOpen = false"
              >
                <span class="dropdown-icon"><PracticumIcon name="bell" /></span>
                <span class="dropdown-copy">
                  <strong>{{ n.title }}</strong>
                  <span>{{ formatTime(n.createdAt) }}</span>
                </span>
              </NuxtLink>
              <span v-else class="dropdown-link dropdown-link-blocked">
                <span class="dropdown-icon"><PracticumIcon name="bell" /></span>
                <span class="dropdown-copy">
                  <strong>{{ n.title }}</strong>
                  <span>目标不可达</span>
                </span>
              </span>
            </li>
          </ul>
          <p v-else class="dropdown-empty">暂无通知</p>
          <div class="dropdown-footer">
            <NuxtLink to="/practicum/notifications" data-view-all-notifications class="text-link" @click="notificationOpen = false">查看全部通知</NuxtLink>
          </div>
        </div>
      </div>

      <div class="profile-wrapper">
        <button
          data-personal-entry
          class="profile-button"
          type="button"
          aria-label="打开个人菜单"
          aria-haspopup="true"
          :aria-expanded="profileOpen"
          @click="toggleProfile"
        >
          <span class="profile-avatar" aria-hidden="true">陈</span>
          <span class="profile-copy">
            <strong>陈老师</strong>
            <small>{{ activeRoleLabel }}</small>
          </span>
          <span class="role-chip">{{ activeRoleLabel }}</span>
          <span class="profile-arrow" aria-hidden="true">⌄</span>
        </button>
        <div v-if="profileOpen" data-profile-dropdown class="topbar-dropdown profile-dropdown" role="menu">
          <div class="dropdown-header">
            <div>
              <strong>陈老师</strong>
              <span>管理账号、成员与实训室</span>
            </div>
            <span class="role-chip">{{ activeRoleLabel }}</span>
          </div>
          <div class="dropdown-list">
            <NuxtLink to="/practicum/profile" class="dropdown-link" role="menuitem" @click="profileOpen = false">
              <span class="dropdown-icon"><PracticumIcon name="user-shield" /></span>
              <span class="dropdown-copy">
                <strong>{{ store.state.activeRole === 'OWNER' ? '账号与权限' : '账号设置' }}</strong>
                <span>头像、通知偏好和身份选择</span>
              </span>
            </NuxtLink>
            <NuxtLink v-if="store.state.activeRole === 'OWNER'" to="/practicum/members" class="dropdown-link" role="menuitem" @click="profileOpen = false">
              <span class="dropdown-icon"><PracticumIcon name="users" /></span>
              <span class="dropdown-copy">
                <strong>成员管理</strong>
                <span>教师、学生、班级与小组成员</span>
              </span>
            </NuxtLink>
            <NuxtLink v-if="store.state.activeRole === 'OWNER'" to="/practicum/room-settings" class="dropdown-link" role="menuitem" @click="profileOpen = false">
              <span class="dropdown-icon"><PracticumIcon name="settings" /></span>
              <span class="dropdown-copy">
                <strong>实训室设置</strong>
                <span>班级配置、开放范围和权限边界</span>
              </span>
            </NuxtLink>
            <button v-if="store.state.activeRole" type="button" data-role-switch class="dropdown-link dropdown-button" role="menuitem" @click="switchRole">
              <span class="dropdown-icon"><PracticumIcon name="switch" /></span>
              <span class="dropdown-copy">
                <strong>{{ store.state.activeRole === 'OWNER' ? '切换为学生视角' : '切换为管理员视角' }}</strong>
                <span>{{ store.state.activeRole === 'OWNER' ? '预览学生看到的工作台' : '回到教师与管理功能' }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="notificationOpen || profileOpen" class="topbar-backdrop" @click="closeMenus" />
  </header>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePracticumStore } from '../../composables/usePracticumStore'

defineProps<{
  contextTitle: string
  contextMeta: string
}>()

const router = useRouter()
const store = usePracticumStore()
const notificationOpen = ref(false)
const profileOpen = ref(false)
const unreadCount = computed(() => store.notificationsUnread())

const roleLabels = {
  OWNER: '管理员',
  STUDENT: '学生',
} as const

const activeRoleLabel = computed(() => {
  if (!store.state.activeRole) return '未选择'
  return roleLabels[store.state.activeRole]
})

const recentNotifications = computed(() => {
  if (!store.state.activeRole) return []
  return store.notificationsForRole(store.state.activeRole).slice(0, 5)
})

function closeMenus() {
  notificationOpen.value = false
  profileOpen.value = false
}

function toggleNotification() {
  notificationOpen.value = !notificationOpen.value
  profileOpen.value = false
}

function toggleProfile() {
  profileOpen.value = !profileOpen.value
  notificationOpen.value = false
}

function handleMarkAllRead() {
  store.markAllNotificationsRead()
}

function switchRole() {
  const nextRole = store.state.activeRole === 'OWNER' ? 'STUDENT' : 'OWNER'
  store.switchRole(nextRole)
  closeMenus()
  router.push('/practicum')
}

function canAccess(n: { targetRoute: string }) {
  if (!store.state.activeRole) return false
  return store.canAccessNotificationRoute(store.state.activeRole, n.targetRoute)
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMenus()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>
