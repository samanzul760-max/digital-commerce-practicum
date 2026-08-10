<template>
  <section class="preview" data-work-order-preview>
    <header class="page-head"><div><p>学生视角预览</p><h1>{{ task?.title || '工单预览' }}</h1><span>此处仅展示学生可见字段，不包含答案键和教师内部解析。</span></div><div class="actions"><NuxtLink :to="`/admin/tasks/${taskId}/edit`">返回编辑</NuxtLink><NuxtLink :to="`/admin/tasks/${taskId}/publications`" class="primary" data-open-publication>发布工单</NuxtLink></div></header>
    <p v-if="loading" class="state">正在生成学生视角预览…</p><p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <template v-else-if="task"><section class="summary"><div><span>班级</span><strong>{{ task.className }}</strong></div><div><span>自动 / 人工</span><strong>{{ task.autoScoreWeight }}% / {{ task.manualScoreWeight }}%</strong></div><div><span>限时</span><strong>{{ task.timeLimitMinutes ? `${task.timeLimitMinutes} 分钟` : '不限时' }}</strong></div></section>
      <article v-for="section in task.sections" :key="section.clientKey" class="preview-section"><header><span>{{ typeLabel(section.type) }}</span><strong>{{ section.title }}</strong><em v-if="section.type !== 'WORK_ORDER'">{{ section.weightPercent }}%</em></header><p v-if="section.description">{{ section.description }}</p>
        <div v-if="section.questions?.length" class="question-list"><div v-for="(question,index) in section.questions" :key="index"><b>{{ index + 1 }}. {{ question.prompt }}</b><ul><li v-for="option in question.options" :key="option.key">{{ option.key }}. {{ option.text }}</li></ul></div></div>
        <ol v-if="section.sandbox?.steps?.length"><li v-for="step in section.sandbox.steps" :key="step.sort"><strong>{{ step.title }}</strong><span>{{ step.instruction }}</span></li></ol>
        <ul v-if="section.mediaItems?.length"><li v-for="media in section.mediaItems" :key="media.sort">{{ media.title }}（{{ media.kind }}）</li></ul>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
interface PreviewTask { title:string; className:string; autoScoreWeight:number; manualScoreWeight:number; timeLimitMinutes:number|null; sections:Array<{clientKey:string;type:string;title:string;description:string;weightPercent:number;questions?:Array<{prompt:string;options:Array<{key:string;text:string}>}>;mediaItems?:Array<{kind:string;title:string;sort:number}>;sandbox?:{steps:Array<{title:string;instruction:string;sort:number}>}|null}> }
const props=defineProps<{taskId:string}>(),task=ref<PreviewTask|null>(null),loading=ref(true),error=ref('')
function typeLabel(value:string){return({WORK_ORDER:'综合工单',MEDIA:'媒体学习',QUIZ:'理论考核',SANDBOX:'实操沙盘'}as Record<string,string>)[value]??value}
onMounted(async()=>{try{task.value=(await $fetch<{task:PreviewTask}>(`/api/admin/tasks/${props.taskId}/preview`)).task}catch{error.value='预览生成失败，请返回编辑器检查工单。'}finally{loading.value=false}})
</script>

<style scoped>
.preview{display:grid;gap:22px}.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.page-head p{margin:0 0 6px;color:#145bc2;font-size:12px;font-weight:700}.page-head h1{margin:0 0 8px;font-size:26px}.page-head span{color:#667085}.actions{display:flex;gap:8px}.actions a{padding:9px 12px;border:1px solid #cbd5e1;border-radius:5px;color:#145bc2;text-decoration:none;white-space:nowrap}.actions a.primary{border-color:#1677ff;background:#1677ff;color:#fff}.summary{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #e4e8ef;background:#fff}.summary div{display:grid;gap:6px;padding:16px;border-right:1px solid #e4e8ef}.summary div:last-child{border:0}.summary span{color:#667085;font-size:12px}.preview-section{padding:20px 0;border-top:1px solid #dfe4ea}.preview-section header{display:flex;align-items:center;gap:10px}.preview-section header span{color:#145bc2;font-size:12px;font-weight:700}.preview-section header strong{font-size:18px}.preview-section header em{margin-left:auto;color:#067647;font-style:normal;font-weight:700}.preview-section>p,.preview-section li span{color:#667085}.question-list{display:grid;gap:14px;margin-top:14px;padding:16px;background:#fff}.question-list ul{margin:8px 0 0;padding-left:22px}.preview-section ol li{margin:10px 0}.preview-section ol span{display:block;margin-top:4px}.state,.error{padding:18px;background:#fff;color:#667085}.error{background:#fef3f2;color:#b42318}@media(max-width:700px){.page-head{flex-direction:column}.summary{grid-template-columns:1fr}.summary div{border-right:0;border-bottom:1px solid #e4e8ef}.actions{flex-wrap:wrap}}
</style>
