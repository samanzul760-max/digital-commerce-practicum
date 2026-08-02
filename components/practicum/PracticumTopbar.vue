<template>
  <header data-practicum-topbar class="workspace-topbar top">
    <NuxtLink to="/practicum" class="logo" aria-label="LearnEC 首页">
      <b aria-hidden="true">L</b>LearnEC
    </NuxtLink>

    <nav class="tabs topbar-tabs" aria-label="全局导航">
      <NuxtLink
        v-for="item in globalTabs"
        :key="item.to"
        :to="item.to"
        :class="{ active: item.active(route.path) }"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="right topbar-actions">
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

      <NuxtLink
        v-if="store.state.activeRole === 'OWNER'"
        to="/practicum/achievements"
        data-achievements-topbar-link
        class="topbar-insight-link"
      >学情成就</NuxtLink>
      <NuxtLink v-if="store.state.activeRole === 'TEACHER'" to="/practicum/classes" data-teacher-classes-link class="blue-btn topbar-primary">我的班级</NuxtLink>
      <NuxtLink v-else :to="primaryAction.to" class="blue-btn topbar-primary">{{ primaryAction.label }}</NuxtLink>

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
        <span>{{ activeRoleLabel }}</span>
      </button>
    </div>

    <div v-if="notificationOpen" data-notification-dropdown class="topbar-dropdown notification-dropdown" role="menu">
      <div class="dropdown-header">
        <div>
          <strong data-dropdown-title>消息通知</strong>
          <span>查看近期消息和提醒</span>
        </div>
        <button v-if="unreadCount" data-mark-all-read type="button" class="text-link compact-link" @click="handleMarkAllRead">全部已读</button>
      </div>
      <ul v-if="recentNotifications.length" class="dropdown-list">
        <li v-for="n in recentNotifications" :key="n.id" :class="['dropdown-item', { 'dropdown-item-unread': !n.read }]" role="menuitem">
          <NuxtLink v-if="canAccess(n)" :to="n.targetRoute" class="dropdown-link" @click="notificationOpen = false">
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
              <span>当前身份不可访问</span>
            </span>
          </span>
        </li>
      </ul>
      <p v-else class="dropdown-empty">暂无通知</p>
      <div class="dropdown-footer">
        <NuxtLink to="/practicum/notifications" data-view-all-notifications class="text-link" @click="notificationOpen = false">查看全部通知</NuxtLink>
      </div>
    </div>

    <div v-if="profileOpen" data-profile-dropdown class="topbar-dropdown profile-dropdown" role="menu">
      <div class="dropdown-header">
        <div>
          <strong>陈老师</strong>
          <span>账号、成员与实训室设置</span>
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
        <button
          v-if="store.state.activeRole === 'OWNER' || store.state.activeRole === 'STUDENT'"
          type="button"
          data-role-switch
          class="dropdown-link dropdown-button"
          role="menuitem"
          @click="switchRole"
        >
          <span class="dropdown-icon"><PracticumIcon name="switch" /></span>
          <span class="dropdown-copy">
            <strong>{{ store.state.activeRole === 'OWNER' ? '切换为学生视角' : '切换为管理员视角' }}</strong>
            <span>{{ store.state.activeRole === 'OWNER' ? '预览学生工作台' : '回到教学管理功能' }}</span>
          </span>
        </button>
      </div>
    </div>

    <div v-if="notificationOpen || profileOpen" class="topbar-backdrop" @click="closeMenus" />
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePracticumStore } from '../../composables/usePracticumStore'
import { usePracticumServer } from '../../composables/usePracticumServer'
import { useWorkspaceContext } from '../../composables/useWorkspaceContext'
import type { PracticumNotification } from '../../domain/practicum/types'

defineProps<{ contextTitle: string; contextMeta: string }>()

const route = useRoute()
const router = useRouter()
const store = usePracticumStore()
const server = usePracticumServer()
const workspace = useWorkspaceContext()
const notificationOpen = ref(false)
const profileOpen = ref(false)
const serverNotifications = ref<PracticumNotification[] | null>(null)
const serverUnread = ref<number | null>(null)
const serverNotificationsForRole = computed(() => {
  if (!store.state.activeRole || !serverNotifications.value) return null
  const matched = serverNotifications.value.filter(item => item.targetRole === store.state.activeRole)
  return matched.length ? matched : null
})
const unreadCount = computed(() => serverNotificationsForRole.value ? (serverUnread.value ?? serverNotificationsForRole.value.filter(n => !n.read).length) : store.notificationsUnread())
const roleLabels = { OWNER: '管理员', TEACHER: '教师', MENTOR: '导师', STUDENT: '学生' } as const
const activeRoleLabel = computed(() => store.state.activeRole ? roleLabels[store.state.activeRole] : '登录')
const recentNotifications = computed(() => serverNotificationsForRole.value ? serverNotificationsForRole.value.slice(0, 5) : store.state.activeRole ? store.notificationsForRole(store.state.activeRole).slice(0, 5) : [])
const firstPublishedPlan = computed(() => store.state.plans.find(plan => plan.status === 'PUBLISHED') ?? null)
const primaryAction = computed(() => store.state.activeRole === 'STUDENT'
  ? { label: '立即开始', to: firstPublishedPlan.value ? `/practicum/learn/${firstPublishedPlan.value.id}` : '/practicum/courses' }
  : { label: '教学管理', to: '/practicum/reviews' })
const globalTabs = [
  { label: '首页', to: '/practicum', active: (path: string) => path === '/practicum' },
  { label: '课程大厅', to: '/practicum/courses', active: (path: string) => path.startsWith('/practicum/courses') },
  { label: '学员中心', to: '/practicum/progress', active: (path: string) => path.startsWith('/practicum/progress') || path.startsWith('/practicum/tasks') },
  { label: '实操学习', to: firstPublishedPlan.value ? `/practicum/learn/${firstPublishedPlan.value.id}` : '/practicum/courses', active: (path: string) => path.startsWith('/practicum/learn') || path.startsWith('/practicum/activities') },
]

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
  if (serverNotifications.value) {
    serverNotifications.value = serverNotifications.value.map(item => ({ ...item, read: true }))
    serverUnread.value = 0
  }
}
function switchRole() {
  store.switchRole(store.state.activeRole === 'OWNER' ? 'STUDENT' : 'OWNER')
  closeMenus()
  router.push('/practicum')
}
function canAccess(n: { targetRoute: string }) {
  return store.state.activeRole ? store.canAccessNotificationRoute(store.state.activeRole, n.targetRoute) : false
}
function formatTime(iso: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenus()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  void workspace.load()
  void loadNotificationsFromServer()
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

watch(() => store.state.activeRole, () => {
  void loadNotificationsFromServer()
})

async function loadNotificationsFromServer() {
  if (!store.state.activeRole) return
  try {
    const response = await server.listNotifications()
    serverNotifications.value = response.items
    serverUnread.value = response.unread
  } catch {
    serverNotifications.value = null
    serverUnread.value = null
  }
}
</script>
