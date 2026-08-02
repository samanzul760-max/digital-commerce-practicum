<template>
  <ClientOnly>
    <PracticumShell context-title="我的班级" context-meta="建立班级、维护学生名单并发布实训任务">
      <PracticumStatePanel v-if="!canManageClass" data-forbidden state="forbidden" title="无法访问班级管理" description="班级管理仅向教学人员开放。" />
      <section v-else class="class-page" data-class-list>
        <header class="page-heading class-heading">
          <div><p class="eyebrow">教学组织</p><h1>我的班级</h1><p>先建立教学班级，再将学生与实训任务纳入同一条教学流程。</p></div>
          <button data-open-create-class class="primary-button" :disabled="loading" type="button" @click="showCreate = !showCreate">新建班级</button>
        </header>
        <form v-if="showCreate" class="form-panel" data-create-class-form @submit.prevent="createClass">
          <label class="field">班级名称<input v-model.trim="name" data-class-name required maxlength="80"></label>
          <label class="field">所属届别<select v-model="cohortId" data-class-cohort required><option value="" disabled>请选择届别</option><option v-for="cohort in cohorts" :key="cohort.id" :value="cohort.id">{{ cohort.name }}</option></select></label>
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <button data-create-class class="primary-button" :disabled="saving || !cohortId" type="submit">{{ saving ? '创建中...' : '创建班级' }}</button>
        </form>
        <p v-if="loading" class="empty-state">正在加载班级数据...</p>
        <PracticumStatePanel v-else-if="!classes.length" state="empty" title="还没有班级" description="创建班级后，即可录入学生并发布实训任务。" />
        <div v-else class="class-table" role="table">
          <article v-for="item in classes" :key="item.id" data-class-row class="class-row" role="row"><div><strong>{{ item.name }}</strong><p>{{ item.cohort?.name ?? '未命名届别' }}</p></div><NuxtLink :to="`/practicum/classes/${item.id}`" data-open-class class="secondary-button">进入班级</NuxtLink></article>
        </div>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { usePracticumServer, type PracticumClass, type PracticumCohort } from '~/composables/usePracticumServer'
import { usePracticumStore } from '~/composables/usePracticumStore'

const store = usePracticumStore()
const server = usePracticumServer()
const classes = ref<PracticumClass[]>([])
const cohorts = ref<PracticumCohort[]>([])
const loading = ref(true)
const saving = ref(false)
const showCreate = ref(false)
const name = ref('')
const cohortId = ref('')
const formError = ref('')
const canManageClass = computed(() => ['OWNER', 'TEACHER'].includes(store.state.activeRole ?? ''))
const organizationId = computed(() => store.state.room.organizationId)
const roomId = computed(() => store.state.room.id)

onMounted(() => void load())
watch(() => store.state.activeRole, () => void load())

async function load() {
  if (!canManageClass.value) return
  loading.value = true
  formError.value = ''
  try {
    const [classResult, cohortResult] = await Promise.all([server.listClasses(organizationId.value, roomId.value), server.listCohorts(organizationId.value, roomId.value)])
    classes.value = classResult.items
    cohorts.value = cohortResult.items
  } catch {
    formError.value = '班级数据暂时无法加载，请稍后重试。'
  } finally { loading.value = false }
}

async function createClass() {
  if (saving.value || !name.value || !cohortId.value) return
  saving.value = true
  formError.value = ''
  try {
    await server.createClass({ organizationId: organizationId.value, roomId: roomId.value, cohortId: cohortId.value, name: name.value })
    name.value = ''
    cohortId.value = ''
    showCreate.value = false
    await load()
  } catch {
    formError.value = '班级创建失败，请检查名称和届别后重试。'
  } finally { saving.value = false }
}
</script>

<style scoped>
.class-page { max-width: 1120px; margin: 0 auto; padding: 24px; }
.class-heading { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; }
.class-table { border-top: 1px solid var(--practicum-border, #e5e7eb); }
.class-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 8px; border-bottom: 1px solid var(--practicum-border, #e5e7eb); }
.class-row p { margin: 4px 0 0; color: var(--practicum-muted, #667085); }
@media (max-width: 640px) { .class-page { padding: 16px; } .class-heading { align-items: flex-start; flex-direction: column; } }
</style>
