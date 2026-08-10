<template>
  <div class="learnec-shell" data-learnec-shell :data-shell-role="role">
    <header class="learnec-top" data-learnec-top>
      <NuxtLink :to="home" class="learnec-logo"><b>✦</b>LearnEC</NuxtLink>
      <nav class="learnec-tabs" :aria-label="role === 'ADMIN' ? '管理端主导航' : '学生端主导航'">
        <NuxtLink v-for="item in menu" :key="item.key" :to="item.to" data-learnec-menu :data-menu-key="item.key" :class="{ active: isActive(item) }">
          <component :is="item.icon" aria-hidden="true" /><span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      <div class="learnec-account"><span>{{ auth.state.value.user?.displayName }}</span><button type="button" aria-label="退出登录" :disabled="auth.state.value.loading" @click="logout"><LogOut aria-hidden="true" /></button></div>
    </header>
    <main class="learnec-content">
      <p v-if="route.query.migrated === 'practicum'" class="legacy-notice" data-legacy-migration-notice><ArrowRightLeft aria-hidden="true" />旧链接已迁移至 LearnEC 新工作区。</p>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ArrowRightLeft, BarChart3, BookOpenCheck, ClipboardList, GraduationCap, LayoutDashboard, LogOut, MessageSquareText, Trophy } from 'lucide-vue-next'

const props = defineProps<{ role: 'ADMIN' | 'STUDENT' }>()
const route = useRoute()
const auth = useAuthSession()
const home = computed(() => props.role === 'ADMIN' ? '/admin' : '/center')
const menu = computed(() => props.role === 'ADMIN'
  ? [
      { key: 'workspace', label: '工作中心', to: '/admin', icon: LayoutDashboard },
      { key: 'tasks', label: '实训任务', to: '/admin/tasks', icon: ClipboardList },
      { key: 'reviews', label: '批阅中心', to: '/admin/reviews', icon: MessageSquareText },
      { key: 'competitions', label: '赛考管理', to: '/admin/competitions', icon: Trophy },
      { key: 'data', label: '数据中心', to: '/admin/data', icon: BarChart3 },
    ]
  : [
      { key: 'home', label: '首页', to: '/center', icon: LayoutDashboard },
      { key: 'assignments', label: '作业中心', to: '/center/assignments', icon: ClipboardList },
      { key: 'practicum', label: '实训中心', to: '/center/practicum', icon: GraduationCap },
      { key: 'data', label: '数据中心', to: '/center/data', icon: BookOpenCheck },
    ])

function isActive(item: { key: string; to: string }) {
  if (route.path === item.to) return true
  if (props.role === 'ADMIN' && item.key === 'tasks') return route.path.startsWith('/admin/tasks/') || route.path === '/admin/assignments'
  return item.to !== home.value && route.path.startsWith(`${item.to}/`)
}

async function logout() {
  await auth.logout()
  await navigateTo('/login')
}
</script>
