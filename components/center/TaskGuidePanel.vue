<template>
  <aside class="outline guide-panel" data-task-guide>
    <div class="guide-eyebrow">任务指导书</div>
    <h1>{{ task.title }}</h1>
    <p class="guide-description">{{ task.description || '按顺序完成所有必做区块，并在右侧工作台保存操作证据。' }}</p>
    <div class="countdown" :data-expired="remainingSeconds <= 0">
      <span>剩余时间</span><strong>{{ countdownText }}</strong>
    </div>
    <div class="guide-progress"><span :style="{ width: `${progress}%` }" /></div>
    <div class="progress-caption">已完成 {{ completedCount }}/{{ totalSteps }} 个步骤</div>
    <ol class="steps">
      <li v-for="step in steps" :key="step.id" :class="{ complete: completedStepIds.includes(step.id), active: !completedStepIds.includes(step.id) }">
        <span class="step-index">{{ completedStepIds.includes(step.id) ? '✓' : step.index }}</span>
        <div><strong>{{ step.title }}</strong><small>{{ step.instruction }}</small></div>
      </li>
    </ol>
    <div v-if="missingItems.length" class="missing" data-missing-items>
      <strong>提交前还需完成</strong>
      <span v-for="item in missingItems.slice(0, 4)" :key="`${item.sectionId}-${item.stepId ?? item.field ?? ''}`">{{ item.title }}{{ item.reason ? `：${item.reason}` : '' }}</span>
      <span v-if="missingItems.length > 4">还有 {{ missingItems.length - 4 }} 项未完成</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
const props = defineProps<{ task: { title: string; description: string; dueAt: string | null; timeLimitMinutes: number | null }; steps: Array<{ id: string; title: string; instruction: string; index: number }>; completedStepIds: string[]; missingItems: Array<{ sectionId: string; stepId?: string; field?: string; title?: string; reason?: string }>; startedAt: string | null }>()
const totalSteps = computed(() => props.steps.length)
const completedCount = computed(() => props.steps.filter(step => props.completedStepIds.includes(step.id)).length)
const progress = computed(() => totalSteps.value ? Math.round(completedCount.value / totalSteps.value * 100) : 0)
const remainingSeconds = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
function updateRemaining() {
  const deadline = props.task.dueAt ? new Date(props.task.dueAt).getTime() : props.startedAt && props.task.timeLimitMinutes ? new Date(props.startedAt).getTime() + props.task.timeLimitMinutes * 60_000 : 0
  remainingSeconds.value = deadline ? Math.max(0, Math.floor((deadline - Date.now()) / 1000)) : 0
}
const countdownText = computed(() => {
  if (!remainingSeconds.value && !props.task.dueAt && !(props.startedAt && props.task.timeLimitMinutes)) return '不限时'
  const seconds = remainingSeconds.value
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
})
onMounted(() => { updateRemaining(); timer = setInterval(updateRemaining, 1000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.guide-panel{padding:24px;background:#fff;border:1px solid #e4e8ef;border-radius:8px;min-width:0}.guide-eyebrow{color:#1677ff;font-size:12px;font-weight:800;letter-spacing:.08em}.guide-panel h1{margin:10px 0 8px;color:#172033;font-size:23px;line-height:1.35}.guide-description{margin:0;color:#667085;font-size:13px;line-height:1.7}.countdown{display:flex;justify-content:space-between;align-items:center;margin:22px 0 12px;padding:12px;background:#f3f7ff;border-radius:6px;color:#315ea8;font-size:12px}.countdown strong{color:#145bc2;font-variant-numeric:tabular-nums;font-size:17px}.countdown[data-expired="true"] strong{color:#b42318}.guide-progress{height:7px;background:#edf0f5;border-radius:99px;overflow:hidden}.guide-progress span{display:block;height:100%;background:#1677ff;border-radius:inherit;transition:width .2s}.progress-caption{margin-top:8px;color:#7b8494;font-size:12px}.steps{display:grid;gap:12px;margin:20px 0 0;padding:0;list-style:none}.steps li{display:grid;grid-template-columns:26px 1fr;gap:10px;align-items:start;color:#475467}.steps li.complete{color:#067647}.step-index{display:grid;place-items:center;width:24px;height:24px;border:1px solid #cbd5e1;border-radius:50%;font-size:12px;font-weight:700}.complete .step-index{border-color:#12b76a;background:#ecfdf3}.steps strong{display:block;font-size:13px;line-height:1.5}.steps small{display:block;margin-top:2px;color:#7b8494;font-size:12px;line-height:1.5}.missing{display:grid;gap:5px;margin-top:20px;padding:12px;border-left:3px solid #f79009;background:#fffaeb;color:#9a3412;font-size:12px;line-height:1.5}.missing strong{color:#b54708}
</style>
