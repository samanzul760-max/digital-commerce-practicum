<template>
  <aside data-practicum-sidebar class="workspace-sidebar" aria-label="主导航">
    <div class="product-mark">
      <span class="product-glyph" aria-hidden="true">L</span>
      <span>
        <strong>LearnEC 实训工作台</strong>
        <small>教学与实操协同平台</small>
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

    <div class="sidebar-foot">
      <strong>{{ store.state.activeRole === 'OWNER' ? '教学管理' : '下一次学习' }}</strong>
      <span>{{ store.state.activeRole === 'OWNER' ? '批阅、成员与数据集中处理' : '继续完成当前实训任务' }}</span>
      <div class="sidebar-progress"><span /></div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePracticumStore } from '../../composables/usePracticumStore'
import { visibleNavItems as getVisibleNavItems } from '../../domain/practicum/permissions'

const route = useRoute()
const store = usePracticumStore()
const visibleNavItems = computed(() => getVisibleNavItems(store.state.activeRole))

function isActive(item: { activeMatch: (path: string) => boolean }) {
  return item.activeMatch(route.path)
}
</script>
