<template>
  <LearnecAppShell role="STUDENT">
    <section v-if="data" class="sandbox-page" data-sandbox-page>
      <div class="page-toolbar">
        <NuxtLink :to="`/center/assignments/${taskId}`">← 指导书概览</NuxtLink>
        <div><span class="save-state">{{ saveState }}</span><button type="button" :disabled="submitting || data.task.status === 'SUBMITTED'" @click="submitTask">{{ data.task.status === 'SUBMITTED' ? '已提交' : submitting ? '正在提交...' : '提交工单' }}</button></div>
      </div>
      <div class="split-layout">
        <CenterTaskGuidePanel :task="data.task" :steps="allSteps" :completed-step-ids="completedStepIds" :missing-items="missingItems" :started-at="data.session?.startedAt ?? null" />
        <CenterSandboxWorkbench :sections="sandboxSections" :student-task-id="taskId" :state="sessionState" :saving="saving" @save="saveDraft" />
      </div>
      <div v-if="message" class="message" :data-kind="messageKind">{{ message }}</div>
    </section>
    <section v-else class="loading">正在加载实训沙盘...</section>
  </LearnecAppShell>
</template>

<script setup lang="ts">
type Section={id:string;type:string;title:string;description:string;required:boolean;weightPercent:number;sandbox?:{sandboxType:string;steps:Array<{id:string;title:string;instruction:string;required:boolean}>}}
type SandboxSection = Section & { sandbox: NonNullable<Section['sandbox']> }
const route=useRoute()
const taskId=String(route.params.studentTaskId)
const saving=ref(false)
const submitting=ref(false)
const saveState=ref('数据已与当前工单隔离')
const message=ref('')
const messageKind=ref<'success'|'error'>('success')
const missingItems=ref<Array<{sectionId:string;stepId?:string;field?:string;title?:string;reason?:string}>>([])
const {data,refresh}=await useFetch<any>(`/api/center/student-tasks/${encodeURIComponent(taskId)}`,{headers:import.meta.server?useRequestHeaders(['cookie']):undefined})
const sandboxSections=computed<SandboxSection[]>(()=>(data.value?.sections??[]).filter((section:Section):section is SandboxSection=>Boolean(section.sandbox)))
const sessionState=computed<Record<string,unknown>>(()=>data.value?.session?.state??{sections:{}})
const allSteps=computed(()=>sandboxSections.value.flatMap((section,index)=>section.sandbox!.steps.map(step=>({...step,index:index+1}))))
const completedStepIds=computed(()=>{const sections=(sessionState.value.sections&&typeof sessionState.value.sections==='object'?sessionState.value.sections:{}) as Record<string,any>;return [...new Set(sandboxSections.value.flatMap(section=>Array.isArray(sections[section.id]?.completedStepIds)?sections[section.id].completedStepIds:[]))] as string[]})

async function saveDraft(payload:{sectionId:string;values:Record<string,unknown>;completedStepIds:string[]}){
  saving.value=true;message.value='';saveState.value='正在写入证据...'
  try{await $fetch(`/api/center/student-tasks/${encodeURIComponent(taskId)}/draft`,{method:'POST',headers:useCsrfHeaders(),body:payload});await refresh();saveState.value=`已保存 ${new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`;messageKind.value='success';message.value='本模块草稿和证据快照已保存。';missingItems.value=[]}
  catch(error:any){saveState.value='保存失败';messageKind.value='error';message.value=error?.data?.data?.code==='TASK_DRAFT_INVALID'?'当前模块数据不完整或格式不正确。':'保存失败，请检查网络后重试。'}
  finally{saving.value=false}
}

async function submitTask(){
  submitting.value=true;message.value='';missingItems.value=[]
  try{const response=await $fetch<any>(`/api/center/student-tasks/${encodeURIComponent(taskId)}/submissions`,{method:'POST',headers:useCsrfHeaders({'Idempotency-Key':`submit-${taskId}-${crypto.randomUUID()}`})});await refresh();messageKind.value='success';message.value=`工单已提交，版本 ${response.submission.currentVersion} 已进入批阅队列。`}
  catch(error:any){const payload=error?.data?.data??{};messageKind.value='error';if(payload.code==='TASK_INCOMPLETE'){missingItems.value=Array.isArray(payload.missingItems)?payload.missingItems:[];message.value=`还有 ${missingItems.value.length} 项必做内容未完成，已在左侧标出。`}else{message.value='提交失败，请检查任务状态后重试。'}}
  finally{submitting.value=false}
}
</script>

<style scoped>
.sandbox-page{min-width:0}.page-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}.page-toolbar>a{color:#667085;font-size:13px;text-decoration:none}.page-toolbar>div{display:flex;align-items:center;gap:12px}.save-state{color:#7b8494;font-size:12px}.page-toolbar button{min-height:38px;padding:0 16px;border:0;border-radius:6px;background:#1677ff;color:#fff;font-weight:800;cursor:pointer}.page-toolbar button:disabled{background:#98a2b3;cursor:not-allowed}.split-layout{display:grid;grid-template-columns:minmax(280px,32%) minmax(0,1fr);gap:16px;align-items:start;min-width:0}.message{position:fixed;right:24px;bottom:24px;max-width:min(420px,calc(100vw - 32px));padding:12px 16px;border:1px solid #a6f4c5;border-radius:6px;background:#ecfdf3;color:#067647;font-size:13px;box-shadow:0 8px 28px rgba(16,24,40,.14);z-index:10}.message[data-kind="error"]{border-color:#fecdca;background:#fef3f2;color:#b42318}.loading{padding:40px;text-align:center;color:#667085}@media(max-width:840px){.split-layout{grid-template-columns:1fr}.page-toolbar{align-items:flex-start;flex-direction:column}.page-toolbar>div{width:100%;justify-content:space-between}}@media(max-width:430px){.save-state{max-width:150px}.page-toolbar button{padding:0 12px}.message{right:16px;bottom:16px}}
</style>
