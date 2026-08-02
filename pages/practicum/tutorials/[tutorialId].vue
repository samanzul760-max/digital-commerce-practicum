<template>
  <ClientOnly>
    <PracticumShell :context-title="tutorial?.title ?? '教程详情'" context-meta="本地原创电商实训教材">
      <PracticumStatePanel v-if="!tutorial" state="empty" title="教程不存在" description="返回教程中心选择其他教程。" />
      <main v-else class="tutorial-document" data-tutorial-document>
        <NuxtLink to="/practicum/tutorials" class="text-link">返回教程中心</NuxtLink>
        <header class="tutorial-document-head"><div><p class="eyebrow">{{ tutorial.category }} · {{ tutorial.level }}</p><h1>{{ tutorial.title }}</h1><p>{{ tutorial.summary }}</p></div><span class="status-pill">建议用时 {{ tutorial.duration }}</span></header>
        <section class="document-section"><h2>学习目标</h2><ul><li v-for="objective in tutorial.objectives" :key="objective">{{ objective }}</li></ul></section>
        <section v-for="section in tutorial.sections" :key="section.title" class="document-section"><h2>{{ section.title }}</h2><p>{{ section.body }}</p><ul v-if="section.bullets?.length"><li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li></ul></section>
        <section class="document-section"><h2>提交物</h2><ul><li v-for="item in tutorial.deliverable" :key="item">{{ item }}</li></ul></section>
        <section class="document-section"><h2>评分标准（100 分）</h2><table><thead><tr><th>维度</th><th>分值</th><th>达标标准</th></tr></thead><tbody><tr v-for="item in tutorial.rubric" :key="item.label"><td>{{ item.label }}</td><td>{{ item.score }}</td><td>{{ item.standard }}</td></tr></tbody></table></section>
      </main>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { findTutorial } from '~/data/practicum/tutorial-catalog'
const route = useRoute()
const tutorial = computed(() => findTutorial(String(route.params.tutorialId)))
</script>

<style scoped>
.tutorial-document { width: min(900px, 100%); margin: 0 auto; padding: 24px; }
.tutorial-document-head { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin: 20px 0; padding-bottom: 20px; border-bottom: 1px solid var(--practicum-border); }
.tutorial-document-head h1 { margin: 6px 0 10px; font-size: 30px; }
.tutorial-document-head p:not(.eyebrow) { margin: 0; color: var(--practicum-muted); line-height: 1.7; }
.document-section { margin-top: 16px; padding: 20px; background: #fff; border: 1px solid var(--practicum-border); border-radius: var(--practicum-radius-md); }
.document-section h2 { margin: 0 0 12px; font-size: 18px; }
.document-section p, .document-section li { color: var(--practicum-ink-soft); line-height: 1.8; font-size: 14px; }
.document-section ul { margin: 0; padding-left: 20px; }
.document-section table { width: 100%; border-collapse: collapse; font-size: 14px; }
.document-section th, .document-section td { padding: 11px; border-bottom: 1px solid var(--practicum-border); text-align: left; vertical-align: top; }
.document-section th { color: var(--practicum-muted); font-size: 12px; }
@media (max-width: 640px) { .tutorial-document { padding: 16px; } .tutorial-document-head { display: block; } .tutorial-document-head .status-pill { display: inline-flex; margin-top: 12px; } .tutorial-document-head h1 { font-size: 24px; } .document-section { padding: 16px; overflow-x: auto; } .document-section table { min-width: 560px; } }
</style>
