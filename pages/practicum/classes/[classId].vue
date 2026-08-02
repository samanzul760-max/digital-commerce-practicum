<template>
  <ClientOnly>
    <PracticumShell context-title="班级工作台" context-meta="维护学生名单，发布并跟踪班级实训任务">
      <PracticumStatePanel v-if="!canManageClass" data-forbidden state="forbidden" title="无法访问班级管理" description="班级管理仅向教学人员开放。" />
      <section v-else class="class-detail" data-class-detail>
        <header class="page-heading"><div><p class="eyebrow">班级教学</p><h1>班级工作台</h1><p>学生、任务与批改进度都从当前班级的服务端数据读取。</p></div><NuxtLink to="/practicum/classes" class="secondary-button">返回班级列表</NuxtLink></header>
        <p v-if="loading" class="empty-state">正在加载班级数据...</p>
        <template v-else>
          <div class="class-workbench-grid">
            <section class="form-panel"><div class="panel-heading"><div><h2>学生名单</h2><p>{{ enrollments.length }} 名已加入成员</p></div></div>
              <div class="inline-form"><select v-model="studentId" data-student-roster><option value="" disabled>选择学生</option><option v-for="student in availableStudents" :key="student.id" :value="student.id">{{ student.displayLabel }}</option></select><button data-enroll-student class="secondary-button" type="button" :disabled="enrolling || !studentId" @click="enroll">{{ enrolling ? '加入中...' : '加入班级' }}</button></div>
              <p v-if="memberError" class="form-error" role="alert">{{ memberError }}</p>
              <div v-if="enrollments.length" class="member-list"><div v-for="item in enrollments" :key="item.id" data-class-member class="member-row"><span>{{ item.userId }}</span><small>{{ item.role === 'STUDENT' ? '学生' : '教学人员' }}</small></div></div><p v-else class="muted">还没有学生加入这个班级。</p>
            </section>
            <section class="form-panel"><div class="panel-heading"><div><h2>发布任务</h2><p>选择已发布课程及其中的实训活动。</p></div></div>
              <form @submit.prevent="publish">
                <label class="field">课程<select v-model="planId" data-assignment-plan required @change="loadActivities"><option value="" disabled>选择课程</option><option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.title }}</option></select></label>
                <label class="field">任务名称<input v-model.trim="assignmentTitle" data-assignment-title required maxlength="120"></label>
                <fieldset class="activity-options"><legend>实训活动</legend><label v-for="activity in activities" :key="activity.id"><input v-model="activityIds" :value="activity.id" type="checkbox">{{ activity.title }}</label><p v-if="planId && !activities.length" class="muted">该课程暂无可发布的实训活动。</p></fieldset>
                <label class="field">开始时间<input v-model="availableAt" data-assignment-available required type="datetime-local"></label><label class="field">截止时间<input v-model="dueAt" type="datetime-local"></label><label class="check-field"><input v-model="lateAllowed" type="checkbox">允许逾期提交</label>
                <p v-if="assignmentError" class="form-error" role="alert">{{ assignmentError }}</p><button data-publish-assignment class="primary-button" :disabled="publishing || !activityIds.length" type="submit">{{ publishing ? '发布中...' : '发布任务' }}</button>
              </form>
            </section>
          </div>
          <section class="assignment-section"><div class="panel-heading"><div><h2>已发布任务</h2><p>按班级汇总任务量、待批量与已评分量。</p></div></div><PracticumStatePanel v-if="!assignments.length" state="empty" title="暂未发布任务" description="发布后，学生会在“我的任务”中收到对应实训活动。" /><div v-else class="assignment-table"><article v-for="assignment in assignments" :key="assignment.id" class="assignment-row"><div><strong>{{ assignment.title }}</strong><p>{{ assignment.taskCount }} 个任务</p></div><div><span>待批 {{ assignment.submittedCount }}</span><span>已评分 {{ assignment.gradedCount }}</span></div></article></div></section>
        </template>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePracticumServer, type ClassAssignment, type ClassEnrollment } from '~/composables/usePracticumServer'
import { usePracticumStore } from '~/composables/usePracticumStore'
import type { Activity, Plan } from '~/domain/practicum/types'

const route = useRoute()
const store = usePracticumStore()
const server = usePracticumServer()
const classId = computed(() => String(route.params.classId ?? ''))
const canManageClass = computed(() => ['OWNER', 'TEACHER'].includes(store.state.activeRole ?? ''))
const enrollments = ref<ClassEnrollment[]>([])
const roster = ref<Array<{ id: string; displayLabel: string }>>([])
const assignments = ref<ClassAssignment[]>([])
const plans = ref<Plan[]>([])
const activities = ref<Activity[]>([])
const studentId = ref('')
const planId = ref('')
const assignmentTitle = ref('')
const activityIds = ref<string[]>([])
const availableAt = ref(new Date().toISOString().slice(0, 16))
const dueAt = ref('')
const lateAllowed = ref(false)
const loading = ref(true)
const enrolling = ref(false)
const publishing = ref(false)
const memberError = ref('')
const assignmentError = ref('')
const availableStudents = computed(() => roster.value.filter(student => !enrollments.value.some(item => item.userId === student.id)))

onMounted(() => void load())
watch(() => store.state.activeRole, () => void load())

async function load() {
  if (!canManageClass.value || !classId.value) return
  loading.value = true
  try {
    const [memberResult, rosterResult, assignmentResult, planResult] = await Promise.all([
      server.listEnrollments(classId.value),
      server.listStudentRoster(store.state.room.organizationId, store.state.room.id),
      server.listClassAssignments(classId.value),
      server.listPlans({ status: 'PUBLISHED', page: 1, pageSize: 50 }),
    ])
    enrollments.value = memberResult.items
    roster.value = rosterResult.items
    assignments.value = assignmentResult.items
    plans.value = planResult.items
  } catch { memberError.value = '班级数据暂时无法加载，请返回列表后重试。' } finally { loading.value = false }
}

async function enroll() {
  if (!studentId.value || enrolling.value) return
  enrolling.value = true
  memberError.value = ''
  try { await server.enrollStudent(classId.value, studentId.value); studentId.value = ''; await load() } catch { memberError.value = '学生加入失败，可能已在本班级中。' } finally { enrolling.value = false }
}

async function loadActivities() {
  activityIds.value = []
  activities.value = []
  if (!planId.value) return
  try { activities.value = (await server.getPlan(planId.value)).activities.filter(activity => activity.type === 'PRACTICE_ACTIVITY') } catch { assignmentError.value = '课程活动暂时无法读取。' }
}

async function publish() {
  if (!planId.value || !assignmentTitle.value || !activityIds.value.length || publishing.value) return
  publishing.value = true
  assignmentError.value = ''
  try {
    await server.publishClassAssignment(classId.value, { planId: planId.value, title: assignmentTitle.value, activityIds: activityIds.value, availableAt: new Date(availableAt.value).toISOString(), dueAt: dueAt.value ? new Date(dueAt.value).toISOString() : undefined, lateAllowed: lateAllowed.value })
    assignmentTitle.value = ''; activityIds.value = []; dueAt.value = ''; lateAllowed.value = false
    assignments.value = (await server.listClassAssignments(classId.value)).items
  } catch { assignmentError.value = '任务发布失败，请检查活动和时间后重试。' } finally { publishing.value = false }
}
</script>

<style scoped>
.class-detail { max-width: 1120px; margin: 0 auto; padding: 24px; }.class-workbench-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }.panel-heading { margin-bottom: 14px; }.panel-heading h2 { margin: 0; font-size: 18px; }.panel-heading p, .assignment-row p { margin: 4px 0 0; color: var(--practicum-muted, #667085); }.inline-form { display: flex; gap: 8px; }.inline-form select { min-width: 0; flex: 1; }.member-list, .assignment-table { border-top: 1px solid var(--practicum-border, #e5e7eb); margin-top: 14px; }.member-row, .assignment-row { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--practicum-border, #e5e7eb); }.assignment-row > div:last-child { display: flex; gap: 12px; color: var(--practicum-muted, #667085); }.activity-options { display: grid; gap: 8px; border: 0; padding: 0; margin: 16px 0; }.activity-options label, .check-field { display: flex; gap: 8px; align-items: center; }.assignment-section { margin-top: 24px; } @media (max-width: 720px) { .class-detail { padding: 16px; }.class-workbench-grid { grid-template-columns: 1fr; }.inline-form { flex-direction: column; } }
</style>
