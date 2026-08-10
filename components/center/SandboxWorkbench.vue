<template>
  <section class="workbench" data-sandbox-workbench>
    <div class="tabs" role="tablist" aria-label="沙盘子模块">
      <button v-for="section in sandboxSections" :key="section.id" type="button" data-sandbox-tab :aria-pressed="section.id === activeId" :class="{ active: section.id === activeId }" @click="activeId = section.id">
        {{ labelFor(section.sandbox?.sandboxType) }}
      </button>
    </div>
    <div v-if="activeSection" class="workspace" data-active-sandbox>
      <header><div><span>{{ labelFor(activeSection.sandbox.sandboxType) }}</span><h2>{{ activeSection.title }}</h2></div><small>数据隔离标识 {{ studentTaskId.slice(-8) }}</small></header>
      <component :is="componentFor(activeSection.sandbox.sandboxType)" v-model="activeValues" />
      <div class="step-checks">
        <label v-for="step in activeSection.sandbox.steps" :key="step.id"><input v-model="activeCompletedSteps" type="checkbox" :value="step.id" /><span><strong>{{ step.title }}</strong><small>{{ step.instruction }}</small></span></label>
      </div>
      <footer><span v-if="savedMessage" class="saved">{{ savedMessage }}</span><button type="button" :disabled="saving" data-save-draft @click="save">{{ saving ? '正在保存...' : '保存本模块' }}</button></footer>
    </div>
  </section>
</template>

<script setup lang="ts">
type SandboxSection={id:string;title:string;sandbox:{sandboxType:string;steps:Array<{id:string;title:string;instruction:string}>}}
const props=defineProps<{sections:SandboxSection[];studentTaskId:string;state:Record<string,unknown>;saving:boolean}>()
const emit=defineEmits<{save:[{sectionId:string;values:Record<string,unknown>;completedStepIds:string[]}]} >()
const labels:Record<string,string>={STORE_BASICS:'店铺基础',PRODUCT_MANAGEMENT:'商品管理',STORE_DECORATION:'店铺装修',MARKETING:'营销活动',BUSINESS_ANALYTICS:'经营分析'}
const sandboxSections=computed(()=>props.sections.filter(section=>section.sandbox))
const activeId=ref('')
const drafts=reactive<Record<string,{values:Record<string,unknown>;completedStepIds:string[]}>>({})
const savedMessage=ref('')
const activeSection=computed(()=>sandboxSections.value.find(section=>section.id===activeId.value)??sandboxSections.value[0])
const activeDraft=computed(()=>{const id=activeSection.value?.id??''; if(!drafts[id])drafts[id]={values:defaultsFor(activeSection.value?.sandbox.sandboxType),completedStepIds:[]};return drafts[id]})
const activeValues=computed({get:()=>activeDraft.value.values,set:value=>{activeDraft.value.values=value}})
const activeCompletedSteps=computed({get:()=>activeDraft.value.completedStepIds,set:value=>{activeDraft.value.completedStepIds=value}})

watch(()=>props.state,hydrate,{immediate:true,deep:true})
watch(sandboxSections,sections=>{if(!activeId.value&&sections[0])activeId.value=sections[0].id},{immediate:true})
function hydrate(){const sections=(props.state&&typeof props.state.sections==='object'&&!Array.isArray(props.state.sections)?props.state.sections:{}) as Record<string,unknown>;for(const section of sandboxSections.value){const current=(sections[section.id]&&typeof sections[section.id]==='object'?sections[section.id]:{}) as Record<string,unknown>;drafts[section.id]={values:{...defaultsFor(section.sandbox.sandboxType),...((current.values&&typeof current.values==='object'?current.values:{}) as Record<string,unknown>)},completedStepIds:Array.isArray(current.completedStepIds)?current.completedStepIds.filter((item):item is string=>typeof item==='string'):[]}}}
function defaultsFor(type?:string):Record<string,unknown>{if(type==='STORE_BASICS')return{freightChargeType:'PIECE'};if(type==='STORE_DECORATION')return{deviceMode:'MOBILE',components:[]};if(type==='MARKETING')return{activityType:'COUPON'};if(type==='BUSINESS_ANALYTICS')return{selectedMetric:'VISITORS'};return{}}
function labelFor(type:string){return labels[type]??type}
function componentFor(type:string){return({STORE_BASICS:resolveComponent('CenterStoreBasicsSandbox'),PRODUCT_MANAGEMENT:resolveComponent('CenterProductManagementSandbox'),STORE_DECORATION:resolveComponent('CenterStoreDecorationSandbox'),MARKETING:resolveComponent('CenterMarketingSandbox'),BUSINESS_ANALYTICS:resolveComponent('CenterBusinessAnalyticsSandbox')} as Record<string,unknown>)[type]}
function save(){if(!activeSection.value)return;savedMessage.value='';emit('save',{sectionId:activeSection.value.id,values:{...activeDraft.value.values,result:'completed'},completedStepIds:[...activeDraft.value.completedStepIds]});savedMessage.value='已发起保存'}
</script>

<style scoped>
.workbench{min-width:0;border:1px solid #e4e8ef;border-radius:8px;background:#fff;overflow:hidden}.tabs{display:flex;gap:0;overflow-x:auto;border-bottom:1px solid #e4e8ef;background:#f8fafc}.tabs button{flex:0 0 auto;min-height:48px;padding:0 16px;border:0;border-bottom:2px solid transparent;background:transparent;color:#667085;font-size:13px;cursor:pointer}.tabs button.active{border-color:#1677ff;background:#fff;color:#145bc2;font-weight:800}.workspace{padding:24px;min-width:0}.workspace>header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:22px}.workspace>header span{color:#1677ff;font-size:12px;font-weight:800}.workspace h2{margin:5px 0 0;color:#172033;font-size:20px}.workspace>header small{padding:5px 8px;border:1px solid #e4e8ef;border-radius:4px;color:#7b8494;font-size:10px;white-space:nowrap}.step-checks{display:grid;gap:8px;margin-top:22px;padding-top:18px;border-top:1px solid #eaecf0}.step-checks label{display:flex;gap:9px;align-items:flex-start;padding:9px;border-radius:5px;background:#f8fafc;color:#344054;font-size:12px}.step-checks input{margin-top:3px}.step-checks span{display:grid;gap:2px}.step-checks small{color:#7b8494}.workspace footer{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:20px}.workspace footer button{min-height:38px;padding:0 15px;border:0;border-radius:6px;background:#1677ff;color:#fff;font-weight:700;cursor:pointer}.workspace footer button:disabled{opacity:.55}.saved{color:#067647;font-size:12px}@media(max-width:560px){.workspace{padding:16px}.workspace>header{display:grid}.workspace>header small{justify-self:start}.tabs button{padding:0 12px}}
</style>
