<template>
  <section class="placeholder-page" data-phase-a-placeholder>
    <p class="eyebrow">阶段 A</p>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <div class="placeholder-state">此入口已纳入全局壳层，业务功能将在对应阶段实现。</div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; description: string }>()
</script>

<style scoped>
.placeholder-page{max-width:760px;padding:34px;border:1px solid #e4e8ef;border-radius:8px;background:#fff}.eyebrow{margin:0 0 8px;color:#145bc2;font-size:12px;font-weight:700}.placeholder-page h1{margin:0;color:#172033;font-size:24px}.placeholder-page>p:not(.eyebrow){margin:14px 0 22px;color:#667085;line-height:1.7}.placeholder-state{padding:14px 16px;border-left:3px solid #1677ff;background:#f0f7ff;color:#475467;font-size:14px;line-height:1.6}
</style>
