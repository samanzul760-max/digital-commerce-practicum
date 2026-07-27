<template>
  <ClientOnly>
    <PracticumShell :context-title="plan?.title ?? '课程编辑'" :context-meta="planMeta">
      <p v-if="isLoading" data-loading class="empty-state">正在加载课程编辑器...</p>

      <p v-else-if="!canEditPlan(store.state.activeRole)" data-forbidden class="empty-state">学生只能查看已发布课程目录，不能进入编辑页面。</p>

      <template v-else>
        <div data-plan-editor>
          <div class="plan-header">
            <div>
              <NuxtLink to="/practicum" data-back-link class="text-link">返回教学计划</NuxtLink>
              <p class="eyebrow">课程编辑</p>
              <h1>{{ plan?.title ?? '计划未找到' }}</h1>
            </div>
            <span v-if="plan" data-plan-status class="status-pill" :class="plan.status === 'DRAFT' ? 'status-pill-orange' : ''">
              {{ planStatusLabel }}
            </span>
          </div>

          <template v-if="plan">
          <section v-if="plan.status === 'ARCHIVED'" data-plan-read-only class="empty-state">该计划已归档，课程目录仅可查看。</section>
          <div class="form-actions">
            <button v-if="plan.status === 'DRAFT'" data-request-publish class="primary-button" type="button" @click="openPublishValidation">发布计划</button>
            <button v-if="plan.status === 'PUBLISHED'" data-request-unpublish class="ghost-button" type="button" @click="showUnpublishConfirm = true">撤回发布</button>
            <button v-if="plan.status === 'PUBLISHED'" data-request-archive class="ghost-button" type="button" @click="showArchiveConfirm = true">归档计划</button>
          </div>
          <section v-if="showUnpublishConfirm" data-unpublish-confirm class="form-panel">
            <h2>确认撤回发布</h2>
            <p>撤回后学生将无法继续访问此计划的学习内容。如需重新发布，需再次通过发布校验。</p>
            <div class="form-actions">
              <button data-confirm-unpublish class="primary-button" type="button" @click="handleUnpublish">确认撤回</button>
              <button class="secondary-button" type="button" @click="showUnpublishConfirm = false">取消</button>
            </div>
          </section>
          <section v-if="showArchiveConfirm" class="form-panel"><p>归档后学生将无法查看，计划将变为只读。</p><div class="form-actions"><button data-confirm-archive class="primary-button" type="button" @click="archiveCurrentPlan">确认归档</button></div></section>
          <section v-if="publishValidation" data-publish-validation class="form-panel">
            <h2>发布前检查</h2>
            <p v-if="!publishValidation.length">计划已满足发布条件。发布后学生即可查看和学习该计划内容。</p>
            <ul v-else><li v-for="error in publishValidation" :key="error">{{ error }}</li></ul>
            <div class="form-actions">
              <button v-if="!publishValidation.length" data-confirm-publish class="primary-button" type="button" @click="handlePublish">确认发布</button>
              <button class="secondary-button" type="button" @click="publishValidation = null">关闭</button>
            </div>
          </section>

          <div class="section-heading">
            <h2>辅助资源</h2>
            <div class="form-actions">
              <button data-student-preview class="secondary-button" type="button" @click="showStudentPreview = !showStudentPreview">学生预览</button>
              <button data-add-supporting-resource class="secondary-button" type="button" @click="showResourceForm = !showResourceForm">添加辅助资源</button>
            </div>
          </div>

          <form v-if="showResourceForm" class="form-panel" @submit.prevent="handleAddResource">
            <div class="form-grid">
              <label class="field">资源名称<input data-resource-name-input v-model="resourceName" type="text"></label>
              <label class="field">资源类型<select data-resource-kind-select v-model="resourceKind"><option value="LINK">链接</option><option value="DOCUMENT">文档</option><option value="VIDEO">视频</option></select></label>
              <label class="field">资源链接<input data-resource-url-input v-model="resourceUrl" type="url"></label>
            </div>
            <div class="form-actions"><button data-resource-submit class="primary-button" type="submit">确认添加</button></div>
          </form>

          <section v-if="showStudentPreview" data-student-preview-panel class="form-panel">
            <h2>学生可见预览</h2>
            <p v-if="!planResources.length" class="empty-state">暂无辅助资源</p>
            <ul v-else class="resource-list"><li v-for="resource in planResources" :key="resource.id"><strong>{{ resource.name }}</strong><a :href="resource.url">{{ resource.url }}</a></li></ul>
          </section>

          <div class="section-heading">
            <h2>课程目录</h2>
            <button data-create-module class="primary-button" type="button" @click="showModuleForm = !showModuleForm">创建一级目录</button>
          </div>

          <form v-if="showModuleForm" data-create-form class="form-panel" @submit.prevent="handleCreateModule">
            <label class="field">目录名称<input data-node-title-input v-model="newNodeTitle" type="text" placeholder="输入目录名称"></label>
            <div class="form-actions">
              <button data-node-submit class="primary-button" type="submit">确认</button>
              <button class="secondary-button" type="button" @click="showModuleForm = false">取消</button>
            </div>
          </form>

          <div v-if="modules.length" data-module-list class="curriculum-list">
            <section v-for="mod in modules" :key="mod.id" data-module class="curriculum-module">
              <div class="curriculum-toggle">
                <button data-module-toggle type="button" :aria-expanded="isExpanded(mod.id)" @click="toggleExpand(mod.id)" style="display:flex;align-items:center;gap:8px;flex:1;background:none;border:0;padding:0;text-align:left;font:inherit;">
                  <span>{{ mod.title }}</span><span aria-hidden="true">{{ isExpanded(mod.id) ? '-' : '+' }}</span>
                </button>
                <div style="display:flex;gap:6px;">
                  <button data-move-up class="ghost-button" type="button" @click="store.reorderNode(mod.id, 'up')" style="font-size:12px;min-height:44px;" :disabled="isFirstSibling(mod.id)">↑</button>
                  <button data-move-down class="ghost-button" type="button" @click="store.reorderNode(mod.id, 'down')" style="font-size:12px;min-height:44px;" :disabled="isLastSibling(mod.id)">↓</button>
                  <button data-rename-module class="ghost-button" type="button" @click="startRename(mod.id, mod.title)" style="font-size:12px;min-height:44px;">重命名</button>
                  <button data-delete-module class="ghost-button" type="button" @click="openDeleteImpact(mod.id)" style="font-size:12px;min-height:44px;">删除</button>
                </div>
              </div>
              <form v-if="renameTarget === mod.id" data-rename-form class="form-panel" @submit.prevent="handleRename">
                <label class="field">新名称<input data-node-title-input v-model="renameTitle" type="text" placeholder="输入新名称"></label>
                <div class="form-actions">
                  <button data-node-submit class="primary-button" type="submit">确认</button>
                  <button class="secondary-button" type="button" @click="renameTarget = null">取消</button>
                </div>
              </form>
              <p class="curriculum-description">{{ mod.description }}</p>

              <div v-if="isExpanded(mod.id)" data-unit-list class="unit-list">
                <section v-for="unit in getChildren(mod.id, 2)" :key="unit.id" data-unit class="curriculum-unit">
                  <div class="curriculum-toggle">
                    <button data-unit-toggle type="button" :aria-expanded="isExpanded(unit.id)" @click="toggleExpand(unit.id)" style="display:flex;align-items:center;gap:8px;flex:1;background:none;border:0;padding:0;text-align:left;font:inherit;">
                      <span>{{ unit.title }}</span><span aria-hidden="true">{{ isExpanded(unit.id) ? '-' : '+' }}</span>
                    </button>
                    <div style="display:flex;gap:6px;">
                      <button data-move-up class="ghost-button" type="button" @click="store.reorderNode(unit.id, 'up')" style="font-size:12px;min-height:44px;" :disabled="isFirstSibling(unit.id)">↑</button>
                      <button data-move-down class="ghost-button" type="button" @click="store.reorderNode(unit.id, 'down')" style="font-size:12px;min-height:44px;" :disabled="isLastSibling(unit.id)">↓</button>
                      <button data-rename-unit class="ghost-button" type="button" @click="startRename(unit.id, unit.title)" style="font-size:12px;min-height:44px;">重命名</button>
                      <button data-delete-unit class="ghost-button" type="button" @click="openDeleteImpact(unit.id)">删除</button>
                    </div>
                  </div>
                  <form v-if="renameTarget === unit.id" data-rename-form class="form-panel" @submit.prevent="handleRename">
                    <label class="field">新名称<input data-node-title-input v-model="renameTitle" type="text" placeholder="输入新名称"></label>
                    <div class="form-actions">
                      <button data-node-submit class="primary-button" type="submit">确认</button>
                      <button class="secondary-button" type="button" @click="renameTarget = null">取消</button>
                    </div>
                  </form>
                  <div v-if="isExpanded(unit.id)" data-activity-list class="activity-list">
                    <div
                      v-for="activity in getChildren(unit.id, 3)"
                      :key="activity.id"
                      data-activity
                      :data-activity-type="activity.activityType"
                      class="activity-row"
                    >
                      <button type="button" style="display:flex;align-items:center;gap:10px;flex:1;background:none;border:0;padding:0;text-align:left;font:inherit;cursor:pointer;color:inherit;" @click="selectActivity(activity.id)">
                        <span data-activity-icon class="activity-type">{{ activityTypeLabel(activity.activityType) }}</span>
                        <span>{{ activity.title }}</span>
                      </button>
                      <button data-remove-activity class="ghost-button" type="button" @click="openDeleteImpact(activity.id)" style="font-size:11px;min-height:44px;padding:2px 8px;">移除</button>
                    </div>
                    <button data-create-activity class="secondary-button" type="button" @click="openCreateActivity(unit.id)">添加活动</button>
                    <form v-if="createActivityFor === unit.id" data-create-activity-form class="form-panel" @submit.prevent="handleCreateActivity(unit.id)">
                      <div class="form-grid">
                        <label class="field">活动名称<input data-activity-title-input v-model="newActivityTitle" type="text" placeholder="输入活动名称"></label>
                        <label class="field">活动类型
                          <select data-activity-type-select v-model="newActivityType">
                            <option value="SOFTWARE_ACTION">软件操作</option>
                            <option value="TRAINING">训练活动</option>
                            <option value="PRACTICE_ACTIVITY">实践活动</option>
                          </select>
                        </label>
                      </div>
                      <div class="form-actions">
                        <button data-activity-submit class="primary-button" type="submit">确认添加</button>
                        <button class="secondary-button" type="button" @click="createActivityFor = null">取消</button>
                      </div>
                    </form>
                  </div>
                </section>

                <button data-create-unit class="secondary-button" type="button" @click="openCreateUnit(mod.id)">创建二级目录</button>
                <form v-if="createUnitFor === mod.id" data-create-form class="form-panel" @submit.prevent="handleCreateUnit(mod.id)">
                  <label class="field">目录名称<input data-node-title-input v-model="newNodeTitle" type="text" placeholder="输入目录名称"></label>
                  <div class="form-actions">
                    <button data-node-submit class="primary-button" type="submit">确认</button>
                    <button class="secondary-button" type="button" @click="createUnitFor = null">取消</button>
                  </div>
                </form>
              </div>
            </section>
          </div>

          <p v-else data-empty class="empty-state">该计划暂无课程目录</p>

        <section v-if="selectedActivity && selectedActivityNode" data-activity-config-panel class="form-panel">
          <div class="section-heading">
            <h2>活动配置 · {{ selectedActivityNode.title }}</h2>
            <span class="status-pill">{{ activityTypeLabel(selectedActivity.type) }}</span>
          </div>

          <!-- SOFTWARE_ACTION config -->
          <template v-if="selectedActivity.config.type === 'SOFTWARE_ACTION'">
            <div class="section-heading"><h3>操作步骤</h3><button data-add-step class="secondary-button" type="button" @click="store.addActivityStep(selectedActivity.id, '', false)">+ 添加步骤</button></div>
            <div v-for="(step, idx) in selectedActivity.config.steps" :key="step.id" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <input data-step-label-input :value="step.label" @input="(e: Event) => store.updateActivityStep(selectedActivity!.id, step.id, (e.target as HTMLInputElement).value, step.required)" placeholder="步骤名称" style="flex:1;min-height:44px;padding:9px 11px;border:1px solid #afbcc8;border-radius:4px;">
              <label style="display:flex;align-items:center;gap:4px;font-size:13px;white-space:nowrap;">
                <input data-step-required-checkbox type="checkbox" :checked="step.required" @change="(e: Event) => store.updateActivityStep(selectedActivity!.id, step.id, step.label, (e.target as HTMLInputElement).checked)" :style="{width:'44px',height:'44px'}"> 必做
              </label>
              <button class="ghost-button" type="button" @click="store.removeActivityStep(selectedActivity!.id, step.id)" style="font-size:12px;min-height:44px;">移除</button>
            </div>
            <p v-if="!selectedActivity.config.steps.length" class="empty-state">暂无操作步骤</p>
          </template>

          <!-- TRAINING config -->
          <template v-if="selectedActivity.config.type === 'TRAINING'">
            <div class="form-grid">
              <label class="field">允许尝试次数<input data-training-max-attempts type="number" :value="(selectedActivity.config as any).maxAttempts" @input="(e: Event) => store.updateTrainingConfig(selectedActivity!.id, Number((e.target as HTMLInputElement).value))" min="1"></label>
              <label class="field">时限（分钟，可选）<input type="number" :value="(selectedActivity.config as any).timeLimitMinutes ?? ''" @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; store.updateTrainingConfig(selectedActivity!.id, (selectedActivity!.config as any).maxAttempts, v ? Number(v) : undefined) }" min="0" placeholder="不限制"></label>
            </div>
          </template>

          <!-- PRACTICE_ACTIVITY config -->
          <template v-if="selectedActivity.config.type === 'PRACTICE_ACTIVITY'">
            <div class="section-heading"><h3>交付物</h3><button class="secondary-button" type="button" @click="store.addDeliverable(selectedActivity!.id, `交付物 ${selectedActivity!.config.deliverables.length + 1}`)">+ 添加</button></div>
            <p v-if="!selectedActivity.config.deliverables.length" class="empty-state">暂无交付物</p>
            <ul v-else><li v-for="d in selectedActivity.config.deliverables" :key="d">{{ d }}</li></ul>
            <div class="section-heading"><h3>评分维度</h3><button data-add-rubric-dimension class="secondary-button" type="button" @click="store.addRubricDimension(selectedActivity!.id, '', 10, true)">+ 添加维度</button></div>
            <div v-for="dim in selectedActivity.config.rubric" :key="dim.id" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <input data-rubric-label-input :value="dim.label" @input="(e: Event) => { dim.label = (e.target as HTMLInputElement).value }" placeholder="维度名称" style="flex:1;min-height:44px;padding:9px 11px;border:1px solid #afbcc8;border-radius:4px;">
              <label>分值<input type="number" :value="dim.maxScore" @input="(e: Event) => { dim.maxScore = Number((e.target as HTMLInputElement).value) }" min="1" style="width:60px;min-height:44px;"></label>
              <label style="font-size:13px;white-space:nowrap;"><input type="checkbox" :checked="dim.required" @change="(e: Event) => { dim.required = (e.target as HTMLInputElement).checked }" style="width:44px;height:44px;"> 必评</label>
            </div>
            <p v-if="!selectedActivity.config.rubric.length" class="empty-state">暂未配置评分维度</p>
          </template>

          <div class="form-actions">
            <button data-save-activity-config class="primary-button" type="button" @click="store.persist(); selectedActivityNodeId = null">完成配置</button>
          </div>
        </section>

        <section v-if="deleteImpact" data-delete-impact class="form-panel">
          <h2>删除影响确认</h2>
          <p>影响活动：{{ deleteImpact.activityCount }}，后代目录：{{ deleteImpact.descendantCount }}，已提交证据：{{ deleteImpact.evidenceCount }}</p>
          <p v-if="deleteImpact.evidenceCount" data-delete-blocked class="empty-state">该目录包含已提交证据，不能删除。</p>
          <div v-else class="form-actions">
            <button data-confirm-delete class="danger-button" type="button" @click="handleDelete">确认删除</button>
            <button class="secondary-button" type="button" @click="deleteImpact = null">取消</button>
          </div>
        </section>

        </template>
        <p v-else data-empty class="empty-state">计划未找到</p>
      </div>
    </template>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { ActivityType, ResourceKind } from '../../../../domain/practicum/types'
import { usePracticumStore } from '../../../../composables/usePracticumStore'
import { canEditPlan } from '../../../../domain/practicum/permissions'

const route = useRoute()
const store = usePracticumStore()
const isLoading = ref(true)
onMounted(() => { isLoading.value = false })
const planId = computed(() => route.params.planId as string)
const plan = computed(() => store.state.plans.find(item => item.id === planId.value) ?? null)
const planNodes = computed(() => store.getPlanNodes(planId.value))
const modules = computed(() => planNodes.value.filter(node => node.level === 1).sort((a, b) => a.sort - b.sort))
const unitCount = computed(() => planNodes.value.filter(node => node.level === 2).length)
const activityCount = computed(() => planNodes.value.filter(node => node.level === 3).length)
const planStatusLabel = computed(() => plan.value?.status === 'PUBLISHED' ? '已发布' : plan.value?.status === 'ARCHIVED' ? '已归档' : '草稿')
const planMeta = computed(() => `${planStatusLabel.value} · ${modules.value.length} 模块 · ${unitCount.value} 单元 · ${activityCount.value} 活动`)
const expanded = ref<Set<string>>(new Set())
const showModuleForm = ref(false)
const createUnitFor = ref<string | null>(null)
const newNodeTitle = ref('')
const createActivityFor = ref<string | null>(null)
const newActivityTitle = ref('')
const newActivityType = ref<ActivityType>('SOFTWARE_ACTION')
const showResourceForm = ref(false)
const showStudentPreview = ref(false)
const resourceName = ref('')
const resourceKind = ref<ResourceKind>('LINK')
const resourceUrl = ref('')
const planResources = computed(() => store.getPlanResources(planId.value))
const deleteImpact = ref<ReturnType<typeof store.getDeletionImpact> | null>(null)
const deleteTargetNodeId = ref<string | null>(null)
const publishValidation = ref<string[] | null>(null)
const showUnpublishConfirm = ref(false)
const showArchiveConfirm = ref(false)
const renameTarget = ref<string | null>(null)
const renameTitle = ref('')

// Activity config
const selectedActivityNodeId = ref<string | null>(null)
const selectedActivity = computed(() => selectedActivityNodeId.value ? store.getActivityByNodeId(selectedActivityNodeId.value) : null)
const selectedActivityNode = computed(() => selectedActivityNodeId.value ? planNodes.value.find(n => n.id === selectedActivityNodeId.value) ?? null : null)

function selectActivity(nodeId: string) {
  selectedActivityNodeId.value = selectedActivityNodeId.value === nodeId ? null : nodeId
}

function startRename(nodeId: string, currentTitle: string) {
  renameTarget.value = nodeId
  renameTitle.value = currentTitle
}

function handleRename() {
  if (!renameTarget.value || !renameTitle.value.trim()) return
  store.renameNode(renameTarget.value, renameTitle.value.trim())
  renameTarget.value = null
  renameTitle.value = ''
}

function getSiblings(nodeId: string) {
  const node = planNodes.value.find(n => n.id === nodeId)
  if (!node) return []
  return planNodes.value
    .filter(n => n.planId === node.planId && n.parentId === node.parentId && n.level === node.level)
    .sort((a, b) => a.sort - b.sort)
}

function isFirstSibling(nodeId: string) {
  const siblings = getSiblings(nodeId)
  return siblings.length > 0 && siblings[0].id === nodeId
}

function isLastSibling(nodeId: string) {
  const siblings = getSiblings(nodeId)
  return siblings.length > 0 && siblings[siblings.length - 1].id === nodeId
}

function toggleExpand(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function isExpanded(id: string) {
  return expanded.value.has(id)
}

function getChildren(parentId: string, level: number) {
  return planNodes.value.filter(node => node.parentId === parentId && node.level === level).sort((a, b) => a.sort - b.sort)
}

function activityTypeLabel(type?: ActivityType) {
  if (type === 'SOFTWARE_ACTION') return '软件操作'
  if (type === 'TRAINING') return '训练活动'
  return '实践活动'
}

function handleCreateModule() {
  if (!newNodeTitle.value.trim() || !plan.value) return
  store.addNode({ planId: plan.value.id, parentId: null, level: 1, title: newNodeTitle.value.trim() })
  newNodeTitle.value = ''
  showModuleForm.value = false
}

function openCreateUnit(moduleId: string) {
  createUnitFor.value = moduleId
  newNodeTitle.value = ''
}

function handleCreateUnit(moduleId: string) {
  if (!newNodeTitle.value.trim() || !plan.value) return
  store.addNode({ planId: plan.value.id, parentId: moduleId, level: 2, title: newNodeTitle.value.trim() })
  newNodeTitle.value = ''
  createUnitFor.value = null
}

function openCreateActivity(unitId: string) {
  createActivityFor.value = unitId
  newActivityTitle.value = ''
  newActivityType.value = 'SOFTWARE_ACTION'
}

function handleCreateActivity(unitId: string) {
  if (!newActivityTitle.value.trim() || !plan.value) return
  store.addNode({
    planId: plan.value.id,
    parentId: unitId,
    level: 3,
    title: newActivityTitle.value.trim(),
    activityType: newActivityType.value,
  })
  newActivityTitle.value = ''
  createActivityFor.value = null
}

function handleAddResource() {
  if (!plan.value || !resourceName.value.trim() || !resourceUrl.value.trim()) return
  store.addSupportingResource({ planId: plan.value.id, name: resourceName.value.trim(), kind: resourceKind.value, url: resourceUrl.value.trim() })
  resourceName.value = ''
  resourceUrl.value = ''
  showResourceForm.value = false
}

function openDeleteImpact(nodeId: string) {
  deleteTargetNodeId.value = nodeId
  deleteImpact.value = store.getDeletionImpact(nodeId)
}

function handleDelete() {
  if (!deleteTargetNodeId.value) return
  store.deleteNode(deleteTargetNodeId.value)
  deleteImpact.value = null
  deleteTargetNodeId.value = null
}

function openPublishValidation() {
  if (!plan.value) return
  publishValidation.value = store.validatePlanForPublish(plan.value.id)
}

function handlePublish() {
  if (!plan.value) return
  store.publishPlan(plan.value.id)
  publishValidation.value = null
}

function handleUnpublish() {
  if (!plan.value) return
  store.unpublishPlan(plan.value.id)
  showUnpublishConfirm.value = false
}

function archiveCurrentPlan() {
  if (!plan.value) return
  store.archivePlan(plan.value.id)
  showArchiveConfirm.value = false
}
</script>
