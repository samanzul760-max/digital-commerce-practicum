<template>
  <aside data-practicum-sidebar class="workspace-sidebar" aria-label="主导航">
    <div class="product-mark">
      <span class="product-sign" aria-hidden="true">DC</span>
      <span>
        <strong>数字商贸实训工作台</strong>
        <small>教学与实训协同平台</small>
      </span>
    </div>

    <nav class="workspace-nav">
      <NuxtLink
        v-for="item in visibleNavItems"
        :key="item.key"
        :to="item.to"
        data-nav-item
        :data-nav-key="item.key"
        class="nav-item"
        :class="{ 'nav-item-active': isActive(item) }"
        :aria-current="isActive(item) ? 'page' : undefined"
      >
        <span class="nav-symbol"><PracticumIcon :name="item.icon" /></span>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>

  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { PracticumRole } from '../../domain/practicum/types'
import { usePracticumStore } from '../../composables/usePracticumStore'

interface NavItem {
  key: string
  label: string
  icon: string
  to: string
  roles: PracticumRole[]
  active: (path: string) => boolean
}

const route = useRoute()
const store = usePracticumStore()

const navItems: NavItem[] = [
  { key: 'workspace', label: '总览', icon: 'dashboard', to: '/practicum', roles: ['OWNER', 'STUDENT'], active: path => path === '/practicum' },
  { key: 'plans', label: '教学', icon: 'book', to: '/practicum#plans', roles: ['OWNER'], active: path => path.startsWith('/practicum/plans') || path.startsWith('/practicum/resources') || path.startsWith('/practicum/learn') || path.startsWith('/practicum/activities') },
  { key: 'cases', label: '案例', icon: 'layers', to: '/practicum/cases', roles: ['OWNER', 'STUDENT'], active: path => path.startsWith('/practicum/cases') },
  { key: 'reviews', label: '教学管理', icon: 'clipboard-check', to: '/practicum/reviews', roles: ['OWNER'], active: path => path.startsWith('/practicum/reviews') || path.startsWith('/practicum/submissions') || path.startsWith('/practicum/members') || path.startsWith('/practicum/room-settings') },
  { key: 'tasks', label: '任务', icon: 'check-square', to: '/practicum/tasks', roles: ['STUDENT'], active: path => path === '/practicum/tasks' },
  { key: 'data-center', label: '数据', icon: 'chart', to: '/practicum/data-center', roles: ['OWNER'], active: path => path === '/practicum/data-center' },
  { key: 'progress', label: '成长数据', icon: 'trending-up', to: '/practicum/progress', roles: ['STUDENT'], active: path => path === '/practicum/progress' },
]

const visibleNavItems = computed(() => {
  const role = store.state.activeRole
  if (!role) return navItems.filter(item => ['workspace', 'plans', 'cases'].includes(item.key) && item.roles.includes('OWNER'))
  return navItems.filter(item => item.roles.includes(role))
})

function isActive(item: NavItem) {
  return item.active(route.path)
}
</script>
