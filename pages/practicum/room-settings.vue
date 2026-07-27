<template>
  <ClientOnly>
    <PracticumShell context-title="实训室设置" context-meta="介绍与媒体元数据">
      <section class="profile-page">
        <div class="page-heading">
          <div>
            <p class="eyebrow">实训室展示</p>
            <h1>实训室设置</h1>
            <p>维护介绍和宣传媒体链接，仅保存元数据，不上传文件。</p>
          </div>
        </div>

        <p v-if="isLoading" data-loading class="empty-state">正在加载实训室设置...</p>
        <p v-else-if="!canManageRoomSettings(store.state.activeRole)" data-forbidden class="empty-state">只有管理员可以编辑实训室设置。</p>

        <form v-else class="form-panel" @submit.prevent="save">
          <label class="field">实训室介绍
            <textarea data-room-introduction v-model="description" rows="5" @input="markDirty" placeholder="输入实训室介绍文字"></textarea>
          </label>
          <label class="field">宣传媒体链接
            <input data-room-media-url v-model="mediaUrl" type="url" @input="markDirty" placeholder="https://example.test/media">
          </label>

          <div v-if="isDirty" data-room-unsaved class="empty-state" style="margin-top:12px;">有未保存的更改。</div>

          <div class="form-actions">
            <button data-save-room-settings class="primary-button" type="submit" :disabled="saving">保存设置</button>
            <button v-if="isDirty" class="secondary-button" type="button" @click="reset">还原</button>
          </div>

          <p v-if="saveSuccess" data-room-saved class="status-pill" style="margin-top:12px;" role="status">已保存</p>
          <p v-if="saveError" data-room-error class="empty-state" style="margin-top:12px;">保存失败，请重试。</p>
        </form>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePracticumStore } from '../../composables/usePracticumStore'
import { canManageRoomSettings } from '../../domain/practicum/permissions'

const store = usePracticumStore()
const isLoading = ref(true)
onMounted(() => { isLoading.value = false })
const description = ref(store.state.room.description)
const mediaUrl = ref(store.state.room.promotionalMediaUrl ?? '')
const isDirty = ref(false)
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref(false)

function markDirty() {
  isDirty.value = true
  saveSuccess.value = false
  saveError.value = false
}

function reset() {
  description.value = store.state.room.description
  mediaUrl.value = store.state.room.promotionalMediaUrl ?? ''
  isDirty.value = false
  saveSuccess.value = false
}

function save() {
  saving.value = true
  saveError.value = false
  try {
    store.updateRoomSettings({
      description: description.value.trim(),
      promotionalMediaUrl: mediaUrl.value.trim(),
    })
    isDirty.value = false
    saveSuccess.value = true
  } catch {
    saveError.value = true
  } finally {
    saving.value = false
  }
}
</script>
