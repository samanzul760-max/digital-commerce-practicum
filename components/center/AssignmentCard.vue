<template>
  <article class="assignment-card" data-assignment-card>
    <div class="card-top">
      <span class="assignment-type">综合实训工单</span>
      <span class="status" :data-status="assignment.status">{{ statusLabel }}</span>
    </div>
    <h2>{{ assignment.title }}</h2>
    <p>{{ assignment.description || '请按指导书完成本次综合实训。' }}</p>
    <div class="meta">
      <span>{{ assignment.autoScoreWeight }}% 自动评分</span>
      <span>{{ assignment.manualScoreWeight }}% 教师评语</span>
      <span v-if="assignment.dueAt">截止 {{ formatDate(assignment.dueAt) }}</span>
      <span v-else>暂无截止时间</span>
    </div>
    <NuxtLink class="card-action" :to="`/center/assignments/${assignment.id}`">查看指导书</NuxtLink>
  </article>
</template>

<script setup lang="ts">
const props = defineProps<{ assignment: { id: string; title: string; description: string; status: string; autoScoreWeight: number; manualScoreWeight: number; dueAt: string | null } }>()
const labels: Record<string, string> = { AVAILABLE: '待开始', IN_PROGRESS: '进行中', SUBMITTED: '已提交', RETURNED: '待重做', GRADED: '已批阅', CLOSED: '已关闭', LOCKED: '未解锁' }
const statusLabel = computed(() => labels[props.assignment.status] ?? props.assignment.status)
function formatDate(value: string) { return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
</script>

<style scoped>
.assignment-card{padding:22px;border:1px solid #e4e8ef;border-radius:8px;background:#fff;box-shadow:0 6px 20px rgba(20,47,79,.04)}.card-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.assignment-type{color:#667085;font-size:12px}.status{padding:4px 9px;border-radius:999px;background:#eef4ff;color:#245bc5;font-size:12px;font-weight:700}.status[data-status="SUBMITTED"],.status[data-status="GRADED"]{background:#ecfdf3;color:#067647}.status[data-status="RETURNED"]{background:#fff4ed;color:#b54708}.assignment-card h2{margin:16px 0 8px;color:#172033;font-size:19px}.assignment-card p{min-height:42px;margin:0;color:#667085;line-height:1.7;font-size:14px}.meta{display:flex;flex-wrap:wrap;gap:8px 16px;margin:17px 0;color:#7b8494;font-size:12px}.card-action{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:6px;background:#1677ff;color:#fff;font-size:13px;font-weight:700;text-decoration:none}.card-action:hover{background:#145bc2}
</style>
