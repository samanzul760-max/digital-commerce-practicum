<template>
  <a class="skip-link" href="#practicum-main">跳到主要内容</a>
  <div data-practicum-shell class="workspace-shell">
    <PracticumSidebar />
    <div data-shell-main class="workspace-main">
      <PracticumTopbar :context-title="contextTitle" :context-meta="contextMeta" />
      <span v-if="auth.state.value.user" data-workspace-authenticated class="sr-only">当前账号：{{ auth.state.value.user.displayName }}</span>
      <div class="sr-only" data-role-live-region aria-live="polite" aria-atomic="true">
        {{ roleAnnouncement }}
      </div>
      <div v-if="storageError" data-storage-error class="storage-recovery" role="alert">
        <div class="storage-recovery-body">
          <strong>数据恢复提醒</strong>
          <p>{{ storageError }}</p>
        </div>
        <div class="form-actions">
          <button data-reset-data class="danger-button" type="button" @click="store.resetDemo()">重置数据</button>
        </div>
      </div>
      <main id="practicum-main" data-practicum-content class="workspace-content" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePracticumStore } from '../../composables/usePracticumStore'
import PracticumSidebar from './PracticumSidebar.vue'
import PracticumTopbar from './PracticumTopbar.vue'
import { useAuthSession } from '../../composables/useAuthSession'

withDefaults(defineProps<{
  contextTitle?: string
  contextMeta?: string
}>(), {
  contextTitle: '实训工作台',
  contextMeta: '数字商贸实训室 01',
})

const store = usePracticumStore()
const auth = useAuthSession()
const storageError = computed(() => store.storageError.value)
onMounted(async () => {
  store.syncStorageError()
  const user = await auth.load()
  if (user) store.switchRole(user.role)
})
const roleLabels = {
  OWNER: '管理员',
  TEACHER: '教师',
  MENTOR: '导师',
  STUDENT: '学生',
} as const

const roleAnnouncement = computed(() => {
  if (!store.state.activeRole) return ''
  return `当前身份：${roleLabels[store.state.activeRole]}`
})
</script>
