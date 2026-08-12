<template>
  <ClientOnly>
    <PracticumShell context-title="计划管理" context-meta="教学计划列表与编辑入口">
      <PracticumStatePanel
        v-if="!canEditPlan(store.state.activeRole)"
        data-forbidden
        state="forbidden"
        title="无法访问计划列表"
        description="计划管理仅向管理员开放。"
      />

      <section v-else data-plan-list-page class="plan-list-page">
        <header class="page-heading">
          <div>
            <p class="eyebrow">教学计划</p>
            <h1>计划列表</h1>
            <p>查看全部计划、进入详情或编辑页面。</p>
          </div>
          <div class="form-actions">
            <NuxtLink to="/practicum" class="secondary-button">返回工作台</NuxtLink>
            <NuxtLink to="/practicum/courses" class="primary-button">课程大厅</NuxtLink>
          </div>
        </header>

        <section class="plan-stat-grid" aria-label="计划概览">
          <article class="plan-stat">
            <span>总计划</span>
            <strong>{{ plans.length }}</strong>
            <small>服务端返回的全部教学计划</small>
          </article>
          <article class="plan-stat">
            <span>已发布</span>
            <strong>{{ publishedCount }}</strong>
            <small>学生可直接进入学习</small>
          </article>
          <article class="plan-stat">
            <span>草稿</span>
            <strong>{{ draftCount }}</strong>
            <small>仍可继续编辑和补充目录</small>
          </article>
        </section>

        <PracticumStatePanel v-if="isLoading" data-loading state="loading" title="正在加载计划列表" description="正在从服务端读取当前实训室的教学计划。" />
        <PracticumStatePanel v-else-if="loadError" data-plan-list-error state="error" title="计划列表加载失败" description="服务端暂时不可用，请稍后重试。" @retry="loadPlans" />

        <section v-else class="table-panel">
          <div class="panel-heading">
            <div>
              <h2>全部计划</h2>
              <p>按更新时间倒序显示。</p>
            </div>
            <NuxtLink to="/practicum/data-center" class="text-link">前往数据中心</NuxtLink>
          </div>

          <table v-if="plans.length" class="plan-table">
            <thead>
              <tr>
                <th>计划</th>
                <th>状态</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="plan in plans" :key="plan.id" data-plan-row>
                <td>
                  <strong>{{ plan.title }}</strong>
                  <small>{{ plan.description || '暂无说明' }}</small>
                </td>
                <td>
                  <span class="status-pill" :class="plan.status === 'DRAFT' ? 'status-pill-orange' : plan.status === 'ARCHIVED' ? 'status-pill-gray' : ''">
                    {{ planStatusLabel(plan.status) }}
                  </span>
                </td>
                <td>{{ formatDate(plan.updatedAt) }}</td>
                <td class="plan-actions">
                  <NuxtLink :to="`/practicum/plans/${plan.id}`" class="text-link">查看</NuxtLink>
                  <NuxtLink :to="`/practicum/plans/${plan.id}/edit`" class="text-link">编辑</NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>

          <PracticumStatePanel v-else state="empty" title="暂无教学计划" description="创建第一份计划后会出现在这里。" />
        </section>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { usePracticumServer } from '~/composables/usePracticumServer'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { canEditPlan } from '~/domain/practicum/permissions'
import type { Plan, PlanStatus } from '~/domain/practicum/types'

const store = usePracticumStore()
const server = usePracticumServer()
const plans = ref<Plan[]>([])
const isLoading = ref(true)
const loadError = ref(false)

const publishedCount = computed(() => plans.value.filter(plan => plan.status === 'PUBLISHED').length)
const draftCount = computed(() => plans.value.filter(plan => plan.status === 'DRAFT').length)

onMounted(() => {
  void loadPlans()
})

watch(() => store.state.activeRole, () => {
  void loadPlans()
})

async function loadPlans() {
  if (!canEditPlan(store.state.activeRole)) {
    plans.value = []
    loadError.value = false
    isLoading.value = false
    return
  }
  isLoading.value = true
  loadError.value = false
  try {
    const response = await server.listPlans({ page: 1, pageSize: 100, sort: 'updatedAt', direction: 'desc' })
    plans.value = response.items
  } catch {
    plans.value = []
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

function planStatusLabel(status: PlanStatus) {
  return status === 'PUBLISHED' ? '已发布' : status === 'ARCHIVED' ? '已归档' : '草稿'
}

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('zh-CN').format(new Date(value)) : '--'
}
</script>

<style scoped>
.plan-list-page { display: grid; gap: 18px; }
.plan-stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.plan-stat { display: grid; gap: 6px; padding: 18px; border: 1px solid var(--practicum-border); border-radius: 6px; background: #fff; }
.plan-stat span { color: var(--practicum-muted); font-size: 12px; }
.plan-stat strong { font-size: 26px; line-height: 1.1; }
.plan-stat small { color: var(--practicum-muted); font-size: 12px; }
.plan-table { width: 100%; border-collapse: collapse; }
.plan-table th, .plan-table td { padding: 12px 18px; border-bottom: 1px solid var(--practicum-border); text-align: left; vertical-align: top; }
.plan-table th { color: var(--practicum-muted); background: #f8fafc; font-size: 12px; }
.plan-table td small { display: block; margin-top: 4px; color: var(--practicum-muted); }
.plan-actions { white-space: nowrap; }
@media (max-width: 900px) {
  .plan-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .plan-list-page :deep(.page-heading) { align-items: flex-start; flex-direction: column; }
  .plan-stat-grid { grid-template-columns: 1fr; }
  .plan-table { min-width: 640px; }
  .table-panel { overflow: auto; }
}
</style>
