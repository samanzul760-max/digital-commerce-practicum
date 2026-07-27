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
import { usePracticumStore } from '../../composables/usePracticumStore'
import { visibleNavItems as getVisibleNavItems } from '../../domain/practicum/permissions'

const route = useRoute()
const store = usePracticumStore()

const visibleNavItems = computed(() => getVisibleNavItems(store.state.activeRole))

function isActive(item: { activeMatch: (path: string) => boolean }) {
  return item.activeMatch(route.path)
}
</script>
