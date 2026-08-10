<template>
  <section class="capability-placeholder" data-capability-placeholder>
    <span class="capability-status">{{ status }}</span>
    <div><h1>{{ title }}</h1><p>{{ description }}</p></div>
    <ul><li v-for="capability in plannedCapabilities" :key="capability">{{ capability }}</li></ul>
    <div class="capability-actions"><NuxtLink :to="availableHref">{{ availableLabel }}</NuxtLink><NuxtLink :to="homeHref">返回工作中心</NuxtLink></div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; description: string; plannedCapabilities: string[]; availableHref: string; availableLabel?: string; homeHref?: string; status?: 'COMING_SOON' }>(), { availableLabel: '查看当前可用能力', homeHref: '/admin', status: 'COMING_SOON' })
</script>
