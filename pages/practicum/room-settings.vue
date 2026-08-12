<template>
  <ClientOnly>
    <PracticumShell context-title="实训室设置" context-meta="介绍与媒体元数据">
      <section class="profile-page" data-room-settings-page>
        <div class="page-heading"><div><p class="eyebrow">实训室展示</p><h1>实训室设置</h1><p>维护介绍、宣传媒体和教学范围，设置只从服务端读取和保存。</p></div></div>

        <p v-if="isLoading" data-loading class="empty-state">正在加载实训室设置...</p>
        <p v-else-if="!canManageRoomSettings(store.state.activeRole)" data-forbidden class="empty-state">只有管理员可以编辑实训室设置。</p>
        <PracticumStatePanel v-else-if="loadError" data-room-settings-error state="error" title="实训室设置暂时无法加载" description="请检查服务端连接后重试。" @retry="load" />

        <form v-else class="form-panel" @submit.prevent="save">
          <label class="field">实训室介绍<textarea v-model="description" data-room-introduction rows="5" @input="markDirty" placeholder="输入实训室介绍"></textarea></label>
          <label class="field">宣传媒体链接<input v-model="mediaUrl" data-room-media-url type="url" @input="markDirty" placeholder="https://example.test/media"></label>
          <div class="form-actions">
            <label class="field compact-field">教学模式<select v-model="teachingMode" data-room-teaching-mode @change="markDirty"><option value="STANDARD">标准式</option><option value="SELF_DIRECTED">自主式</option><option value="BLENDED">混合式</option></select></label>
            <label class="field compact-field">公开范围<select v-model="visibility" data-room-visibility @change="markDirty"><option value="PRIVATE">仅成员</option><option value="ORGANIZATION">组织内</option></select></label>
          </div>
          <div v-if="isDirty" data-room-unsaved class="empty-state" style="margin-top:12px;">有未保存的更改。</div>
          <div class="form-actions"><button data-save-room-settings class="primary-button" type="submit" :disabled="saving">保存设置</button><button v-if="isDirty" class="secondary-button" type="button" @click="reset">还原</button></div>
          <p v-if="saveSuccess" data-room-saved class="status-pill" style="margin-top:12px;" role="status">已保存</p>
          <p v-if="saveError" data-room-error class="empty-state" style="margin-top:12px;">保存失败，请重试。</p>
        </form>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCsrfHeaders } from '~/composables/useCsrfHeaders'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { canManageRoomSettings } from '~/domain/practicum/permissions'

type RoomSetting = { roomId: string; description: string; promotionalMediaUrl: string; teachingMode: 'STANDARD' | 'SELF_DIRECTED' | 'BLENDED'; visibility: 'PRIVATE' | 'ORGANIZATION'; updatedAt: string | null }

const store = usePracticumStore()
const isLoading = ref(true)
const loadError = ref(false)
const description = ref('')
const mediaUrl = ref('')
const teachingMode = ref<RoomSetting['teachingMode']>('STANDARD')
const visibility = ref<RoomSetting['visibility']>('PRIVATE')
const savedSetting = ref<RoomSetting | null>(null)
const isDirty = ref(false)
const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref(false)
const roomId = computed(() => String(store.state.room.id ?? 'room-001'))

function applySetting(setting: RoomSetting) {
  savedSetting.value = setting
  description.value = setting.description
  mediaUrl.value = setting.promotionalMediaUrl
  teachingMode.value = setting.teachingMode
  visibility.value = setting.visibility
  isDirty.value = false
}

async function load() {
  if (!canManageRoomSettings(store.state.activeRole)) { isLoading.value = false; return }
  isLoading.value = true
  loadError.value = false
  try {
    const response = await $fetch<{ setting: RoomSetting }>(`/api/practicum/room-settings?roomId=${encodeURIComponent(roomId.value)}`)
    applySetting(response.setting)
  } catch { loadError.value = true } finally { isLoading.value = false }
}

function markDirty() { isDirty.value = true; saveSuccess.value = false; saveError.value = false }
function reset() { if (savedSetting.value) applySetting(savedSetting.value); saveSuccess.value = false }

async function save() {
  saving.value = true
  saveError.value = false
  try {
    const response = await $fetch<{ setting: RoomSetting }>('/api/practicum/room-settings', {
      method: 'PUT', headers: useCsrfHeaders(),
      body: { roomId: roomId.value, description: description.value.trim(), promotionalMediaUrl: mediaUrl.value.trim(), teachingMode: teachingMode.value, visibility: visibility.value },
    })
    applySetting(response.setting)
    saveSuccess.value = true
  } catch { saveError.value = true } finally { saving.value = false }
}

onMounted(load)
</script>
