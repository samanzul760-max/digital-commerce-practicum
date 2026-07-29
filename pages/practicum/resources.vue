<template>
  <ClientOnly>
    <PracticumShell context-title="资源中心" context-meta="辅助资源元数据">
      <section class="profile-page">
        <div class="page-heading">
          <div>
            <p class="eyebrow">资源管理</p>
            <h1>辅助资源库</h1>
            <p>仅保存资源名称、类型和链接，不上传文件。</p>
          </div>
        </div>

        <p v-if="isLoading" data-loading class="empty-state">正在加载资源列表...</p>
        <p v-else-if="!canManageResources(store.state.activeRole)" data-forbidden class="empty-state">只有管理员可以管理资源。</p>

        <p v-else-if="loadError" data-resource-error class="empty-state">Resource loading failed. Please retry.</p>

        <template v-else>
          <div class="section-heading">
            <h2>资源列表</h2>
            <button data-library-add-resource class="primary-button" type="button" @click="showForm = !showForm">新增资源</button>
          </div>

          <form v-if="showForm" class="form-panel" @submit.prevent="saveResource">
            <div class="form-grid">
              <label class="field">名称<input data-library-resource-name v-model="name"></label>
              <label class="field">类型
                <select data-library-resource-kind v-model="kind">
                  <option value="LINK">链接</option>
                  <option value="DOCUMENT">文档</option>
                  <option value="VIDEO">视频</option>
                </select>
              </label>
              <label class="field">链接<input data-library-resource-url v-model="url" type="url"></label>
            </div>
            <div class="form-actions">
              <button data-library-resource-save class="primary-button" type="submit">保存资源</button>
              <button class="secondary-button" type="button" @click="showForm = false">取消</button>
            </div>
          </form>

          <div class="form-grid">
            <label class="field">搜索资源<input data-resource-search v-model="query" type="text" placeholder="按名称搜索"></label>
            <label class="field">类型筛选
              <select data-resource-kind-filter v-model="kindFilter">
                <option value="">全部类型</option>
                <option value="LINK">链接</option>
                <option value="DOCUMENT">文档</option>
                <option value="VIDEO">视频</option>
              </select>
            </label>
          </div>

          <p v-if="!filteredResources.length" data-resource-empty class="empty-state">没有符合条件的资源。</p>

          <div v-else class="plan-list">
            <div v-for="resource in paginatedResources" :key="resource.id" data-library-resource class="plan-row">
              <div>
                <strong>{{ resource.name }}</strong>
                <span>{{ resource.kind }} · {{ resource.url }}</span>
              </div>
              <div class="plan-actions">
                <button data-library-remove-resource class="ghost-button" type="button" @click="confirmRemove(resource.id)">移除</button>
              </div>
            </div>
          </div>

          <div v-if="totalPages > 1" class="form-actions" style="justify-content:center;">
            <button class="secondary-button" type="button" :disabled="page <= 1" @click="page--">上一页</button>
            <span style="padding:0 12px;line-height:44px;">{{ page }} / {{ totalPages }}</span>
            <button class="secondary-button" type="button" :disabled="page >= totalPages" @click="page++">下一页</button>
          </div>

          <section v-if="removeTarget" data-resource-remove-impact class="form-panel">
            <h2>移除资源确认</h2>
            <p>确定要移除此资源吗？该操作将从所有绑定计划中移除该资源。</p>
            <div class="form-actions">
              <button data-confirm-remove-resource class="danger-button" type="button" @click="handleRemove">确认移除</button>
              <button class="secondary-button" type="button" @click="removeTarget = null">取消</button>
            </div>
          </section>
        </template>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { ResourceKind, SupportingResource } from '../../domain/practicum/types'
import { usePracticumStore } from '../../composables/usePracticumStore'
import { canManageResources } from '../../domain/practicum/permissions'

const PER_PAGE = 5

const store = usePracticumStore()
const isLoading = ref(true)
const loadError = ref(false)
const isSaving = ref(false)
const serverResources = ref<SupportingResource[]>([])
onMounted(async () => {
  try {
    const result = await $fetch<{ items: SupportingResource[] }>('/api/practicum/resources?page=1&pageSize=50')
    serverResources.value = result.items
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
  }
})
const showForm = ref(false)
const name = ref('')
const url = ref('')
const kind = ref<ResourceKind>('LINK')
const query = ref('')
const kindFilter = ref('')
const page = ref(1)
const removeTarget = ref<string | null>(null)

const filteredResources = computed(() => {
  let list = serverResources.value
  if (query.value.trim()) {
    const q = query.value.trim().toLowerCase()
    list = list.filter(r => r.name.toLowerCase().includes(q))
  }
  if (kindFilter.value) {
    list = list.filter(r => r.kind === kindFilter.value)
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredResources.value.length / PER_PAGE)))

const paginatedResources = computed(() => {
  const start = (page.value - 1) * PER_PAGE
  return filteredResources.value.slice(start, start + PER_PAGE)
})

async function saveResource() {
  if (!name.value.trim() || !url.value.trim() || isSaving.value) return
  isSaving.value = true
  try {
    const result = await $fetch<{ resource: SupportingResource }>('/api/practicum/resources', {
      method: 'POST',
      headers: useCsrfHeaders({ 'Idempotency-Key': `resource-ui-${Date.now()}` }),
      body: { planId: 'library', name: name.value.trim(), kind: kind.value, url: url.value.trim() },
    })
    serverResources.value = [result.resource, ...serverResources.value]
    name.value = ''; url.value = ''; showForm.value = false
  } catch {
    loadError.value = true
  } finally {
    isSaving.value = false
  }
}

function confirmRemove(resourceId: string) {
  removeTarget.value = resourceId
}

async function handleRemove() {
  if (!removeTarget.value) return
  const target = removeTarget.value
  try {
    await $fetch(`/api/practicum/resources/${target}`, { method: 'DELETE', headers: useCsrfHeaders() })
    serverResources.value = serverResources.value.filter(resource => resource.id !== target)
  } catch {
    loadError.value = true
  }
  removeTarget.value = null
  if (paginatedResources.value.length === 0 && page.value > 1) page.value--
}
</script>
