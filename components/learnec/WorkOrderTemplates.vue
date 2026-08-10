<template>
  <section class="templates" data-work-order-templates><header class="page-head"><div><p>实训任务管理</p><h1>工单模板</h1><span>复制模板会创建独立草稿，不与原模板共享可变区块。</span></div><NuxtLink to="/admin/tasks">返回工单列表</NuxtLink></header>
    <div class="copy-settings"><label>目标班级<select v-model="classId"><option v-for="item in classes" :key="item.id" :value="item.id">{{ item.name }}</option></select></label></div>
    <p v-if="loading" class="state">正在读取模板…</p><p v-else-if="error" class="error" role="alert">{{ error }}</p><p v-else-if="templates.length===0" class="state">暂无模板，可在工单编辑完成后保存为模板。</p>
    <div v-else class="template-list"><article v-for="item in templates" :key="item.id"><div><span>{{ item.defaultAutoWeight }}% 自动 / {{ item.defaultManualWeight }}% 人工</span><h2>{{ item.title }}</h2><p>{{ item.description || '暂无说明' }}</p></div><button type="button" :disabled="copying===item.id||!classId" data-template-copy @click="copy(item)">{{ copying===item.id?'正在复制…':'复制为新工单' }}</button></article></div>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
  </section>
</template>

<script setup lang="ts">
interface TemplateItem{id:string;title:string;description:string;defaultAutoWeight:number;defaultManualWeight:number} interface AdminClass{id:string;name:string}
const templates=ref<TemplateItem[]>([]),classes=ref<AdminClass[]>([]),classId=ref(''),loading=ref(true),error=ref(''),notice=ref(''),copying=ref('')
async function copy(item:TemplateItem){copying.value=item.id;error.value='';notice.value='';try{const response=await $fetch<{task:{id:string}}>(`/api/admin/task-templates/${item.id}/copy`,{method:'POST',headers:useCsrfHeaders({'Idempotency-Key':`template-copy-${crypto.randomUUID()}`}),body:{classId:classId.value,title:`${item.title} 副本`}});notice.value='模板已复制为独立草稿。';await navigateTo(`/admin/tasks/${response.task.id}/edit`)}catch{error.value='模板复制失败，请检查班级权限。'}finally{copying.value=''}}
onMounted(async()=>{try{const[result,classResult]=await Promise.all([$fetch<{templates:TemplateItem[]}>('/api/admin/task-templates'),$fetch<{classes:AdminClass[]}>('/api/admin/classes')]);templates.value=result.templates;classes.value=classResult.classes;classId.value=classes.value[0]?.id??''}catch{error.value='模板读取失败。'}finally{loading.value=false}})
</script>

<style scoped>
.templates{display:grid;gap:22px}.page-head{display:flex;justify-content:space-between;gap:18px}.page-head p{margin:0 0 6px;color:#145bc2;font-size:12px;font-weight:700}.page-head h1{margin:0 0 8px;font-size:26px}.page-head span{color:#667085}.page-head>a{height:36px;padding:0 12px;border:1px solid #cbd5e1;border-radius:5px;color:#145bc2;text-decoration:none;display:flex;align-items:center}.copy-settings{padding:14px 0;border-block:1px solid #e4e8ef}.copy-settings label{display:grid;gap:6px;max-width:340px;color:#475467;font-size:12px}.copy-settings select{height:38px;padding:0 10px;border:1px solid #d0d5dd;border-radius:4px;background:#fff}.template-list{border-top:1px solid #e4e8ef}.template-list article{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 0;border-bottom:1px solid #e4e8ef}.template-list span{color:#145bc2;font-size:12px;font-weight:700}.template-list h2{margin:6px 0;font-size:18px}.template-list p{margin:0;color:#667085}.template-list button{min-height:36px;padding:0 13px;border:1px solid #1677ff;border-radius:4px;background:#1677ff;color:#fff;font-weight:600;cursor:pointer}.state,.error,.notice{padding:16px;background:#fff;color:#667085}.error{background:#fef3f2;color:#b42318}.notice{background:#ecfdf3;color:#067647}@media(max-width:650px){.page-head,.template-list article{align-items:stretch;flex-direction:column}.template-list button{align-self:flex-start}}
</style>
