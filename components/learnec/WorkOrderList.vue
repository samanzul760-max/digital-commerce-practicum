<template>
  <section class="work-orders" data-work-order-list>
    <header class="page-head">
      <div><p>实训任务管理</p><h1>{{ title }}</h1><span>工单、区块和发布状态均来自教学数据库。</span></div>
      <div class="head-actions"><NuxtLink to="/admin/tasks/templates">工单模板</NuxtLink><NuxtLink class="primary" to="/admin/tasks/new">新建综合任务</NuxtLink></div>
    </header>
    <div class="filters">
      <label>搜索<input v-model.trim="search" type="search" placeholder="工单名称或班级" /></label>
      <label>状态<select v-model="status"><option value="">全部</option><option value="DRAFT">草稿</option><option value="PUBLISHED">已发布</option><option value="CLOSED">已关闭</option></select></label>
      <button type="button" :disabled="loading" @click="load">刷新</button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="loading" class="state">正在读取工单…</div>
    <div v-else-if="filtered.length === 0" class="state">暂无符合条件的工单，可从新建综合任务开始。</div>
    <div v-else class="table-wrap">
      <table><thead><tr><th>工单</th><th>班级</th><th>状态</th><th>区块</th><th>学生任务</th><th>操作</th></tr></thead>
        <tbody><tr v-for="task in filtered" :key="task.id"><td><strong>{{ task.title }}</strong><small>{{ task.description || '暂无说明' }}</small></td><td>{{ task.className }}</td><td><span class="status" :data-status="task.status">{{ statusLabel(task.status) }}</span></td><td>{{ task.sectionCount }}</td><td>{{ task.studentTaskCount }}</td><td class="actions"><NuxtLink :to="`/admin/tasks/${task.id}/edit`">编辑</NuxtLink><NuxtLink :to="`/admin/tasks/${task.id}/preview`">预览</NuxtLink><NuxtLink :to="`/admin/tasks/${task.id}/publications`">发布</NuxtLink></td></tr></tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
interface WorkOrderRow { id: string; title: string; description: string; className: string; status: string; sectionCount: number; studentTaskCount: number }
const props = withDefaults(defineProps<{ title?: string; initialStatus?: string }>(), { title: '综合工单', initialStatus: '' })
const tasks = ref<WorkOrderRow[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const status = ref(props.initialStatus)
const filtered = computed(() => {
  const keyword = search.value.toLowerCase()
  return tasks.value.filter(task => (!status.value || task.status === status.value) && (!keyword || `${task.title} ${task.className}`.toLowerCase().includes(keyword)))
})
function statusLabel(value: string) { return ({ DRAFT: '草稿', PUBLISHED: '已发布', CLOSED: '已关闭' } as Record<string, string>)[value] ?? value }
async function load() {
  loading.value = true; error.value = ''
  try { tasks.value = (await $fetch<{ tasks: WorkOrderRow[] }>('/api/admin/tasks')).tasks } catch { error.value = '工单读取失败，请稍后重试。' } finally { loading.value = false }
}
onMounted(load)
</script>

<style scoped>
.work-orders{display:grid;gap:22px}.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.page-head p{margin:0 0 6px;color:#145bc2;font-size:12px;font-weight:700}.page-head h1{margin:0 0 8px;font-size:26px}.page-head span{color:#667085;font-size:14px}.head-actions,.actions{display:flex;flex-wrap:wrap;gap:9px}.head-actions a,.filters button{min-height:36px;padding:0 14px;border:1px solid #cbd5e1;border-radius:5px;background:#fff;color:#344054;font-size:14px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center}.head-actions a.primary{border-color:#1677ff;background:#1677ff;color:#fff}.filters{display:flex;align-items:end;gap:12px;padding:16px 0;border-top:1px solid #e4e8ef;border-bottom:1px solid #e4e8ef}.filters label{display:grid;gap:6px;color:#475467;font-size:12px}.filters input,.filters select{height:36px;min-width:200px;padding:0 10px;border:1px solid #d0d5dd;border-radius:4px;background:#fff}.filters button{cursor:pointer}.state,.error{padding:18px;background:#fff;color:#667085}.error{background:#fef3f2;color:#b42318}.table-wrap{overflow-x:auto;background:#fff}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:14px 12px;border-bottom:1px solid #eaecf0;font-size:14px;vertical-align:top}th{color:#667085;font-size:12px}td strong,td small{display:block}td small{margin-top:5px;color:#667085}.status{font-weight:600;color:#475467}.status[data-status="PUBLISHED"]{color:#067647}.actions a{color:#145bc2;text-decoration:none;white-space:nowrap}@media(max-width:760px){.page-head,.filters{align-items:stretch;flex-direction:column}.filters input,.filters select{width:100%}.head-actions a{flex:1;justify-content:center}}
</style>
