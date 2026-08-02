<template>
  <ClientOnly>
    <PracticumShell context-title="教程中心" context-meta="本地原创电商实训教材与作业说明">
      <main class="tutorial-library" data-tutorial-library>
        <header class="page-heading"><div><p class="eyebrow">本地教程库</p><h1>电商实训教程</h1><p>每篇教程都包含目标、操作步骤、提交物和评分标准，可直接用于课堂练习。</p></div><span class="status-pill">{{ tutorials.length }} 篇教程</span></header>
        <div class="tutorial-grid">
          <article v-for="tutorial in tutorials" :key="tutorial.id" class="tutorial-card" data-tutorial-card>
            <div class="tutorial-card-top"><span>{{ tutorial.category }}</span><strong>{{ tutorial.level }}</strong></div>
            <h2>{{ tutorial.title }}</h2>
            <p>{{ tutorial.summary }}</p>
            <div class="tutorial-meta"><span>{{ tutorial.duration }}</span><span>{{ tutorial.deliverable.length }} 项提交物</span></div>
            <NuxtLink :to="`/practicum/tutorials/${tutorial.id}`" class="primary-button">打开教程</NuxtLink>
          </article>
        </div>
      </main>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { tutorialDocuments } from '~/data/practicum/tutorial-catalog'
const tutorials = tutorialDocuments
</script>

<style scoped>
.tutorial-library { width: min(1180px, 100%); margin: 0 auto; padding: 24px; }
.tutorial-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.tutorial-card { display: grid; gap: 12px; min-height: 250px; padding: 20px; background: #fff; border: 1px solid var(--practicum-border); border-radius: var(--practicum-radius-md); }
.tutorial-card-top, .tutorial-meta { display: flex; justify-content: space-between; gap: 8px; color: var(--practicum-muted); font-size: 12px; }
.tutorial-card-top strong { color: var(--practicum-accent); }
.tutorial-card h2 { margin: 0; font-size: 18px; }
.tutorial-card p { margin: 0; color: var(--practicum-muted); font-size: 13px; line-height: 1.7; }
.tutorial-card .primary-button { align-self: end; justify-content: center; }
@media (max-width: 860px) { .tutorial-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .tutorial-library { padding: 16px; } .tutorial-grid { grid-template-columns: 1fr; } }
</style>
