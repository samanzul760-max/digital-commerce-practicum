<template>
  <ClientOnly>
    <PracticumShell context-title="成员管理" context-meta="匿名原型成员与虚拟分组">
      <section class="profile-page">
        <div class="page-heading">
          <div>
            <p class="eyebrow">成员与分组</p>
            <h1>成员管理</h1>
            <p>此处仅提供匿名成员和虚拟分组演示。不涉及真实账号或外部通讯。</p>
          </div>
        </div>

        <p v-if="isLoading" data-loading class="empty-state">正在加载成员列表...</p>
        <p v-else-if="store.state.activeRole !== 'OWNER'" data-forbidden class="empty-state">只有管理员可以管理成员。</p>

        <template v-else>
          <div class="section-heading">
            <h2>成员列表</h2>
            <span class="status-pill">{{ store.state.members.length }} 名成员</span>
          </div>

          <p v-if="!store.state.members.length" data-members-empty class="empty-state">暂无成员。</p>

          <div v-else class="plan-list">
            <div v-for="member in store.state.members" :key="member.id" data-member-row class="plan-row">
              <div>
                <strong>{{ member.label }}</strong>
                <span>{{ roleLabel(member.role) }} · {{ member.group }}</span>
              </div>
              <div class="form-actions">
                <input data-member-group v-model="groups[member.id]" aria-label="虚拟分组" style="min-height:44px;padding:9px 11px;border:1px solid #afbcc8;border-radius:4px;" placeholder="输入分组名称">
                <button data-save-member-group class="secondary-button" type="button" @click="saveGroup(member.id)">保存分组</button>
                <button data-change-member-role class="ghost-button" type="button" @click="openRoleChange(member.id)">变更角色</button>
                <button data-remove-member class="ghost-button" type="button" @click="openRemoveMember(member.id)">移除</button>
              </div>
            </div>
          </div>

          <!-- Virtual group summary -->
          <div v-if="groupSummary.length" style="margin-top:24px;">
            <div class="section-heading"><h2>虚拟分组概览</h2></div>
            <div class="plan-list">
              <div v-for="g in groupSummary" :key="g.name" class="plan-row">
                <div><strong>{{ g.name }}</strong><span>{{ g.count }} 名成员</span></div>
              </div>
            </div>
          </div>

          <!-- Role change confirmation -->
          <section v-if="roleChangeTarget" data-role-change-impact class="form-panel">
            <h2>变更成员角色</h2>
            <p>{{ roleChangeMember?.label }} 当前角色：{{ roleLabel(roleChangeMember?.role) }}。变更后该成员将获得不同工作区权限。</p>
            <div class="form-actions">
              <select data-new-role-select v-model="newRole" style="min-height:44px;">
                <option value="OWNER">管理员</option>
                <option value="STUDENT">学生</option>
              </select>
              <button data-confirm-role-change class="primary-button" type="button" @click="handleRoleChange">确认变更</button>
              <button class="secondary-button" type="button" @click="roleChangeTarget = null">取消</button>
            </div>
          </section>

          <!-- Remove member confirmation -->
          <section v-if="removeTarget" data-remove-member-impact class="form-panel">
            <h2>移除成员确认</h2>
            <p>{{ removeTargetMember?.label }}（{{ roleLabel(removeTargetMember?.role) }} · {{ removeTargetMember?.group }}）将被移出实训室。该成员的提交记录将保留但不可再访问。</p>
            <div class="form-actions">
              <button data-confirm-remove-member class="danger-button" type="button" @click="handleRemoveMember">确认移除</button>
              <button class="secondary-button" type="button" @click="removeTarget = null">取消</button>
            </div>
          </section>
        </template>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { usePracticumStore } from '../../composables/usePracticumStore'

const store = usePracticumStore()
const isLoading = ref(true)
onMounted(() => { isLoading.value = false })
const groups = reactive(Object.fromEntries(store.state.members.map(m => [m.id, m.group])) as Record<string, string>)
const roleChangeTarget = ref<string | null>(null)
const newRole = ref<'OWNER' | 'STUDENT'>('STUDENT')
const removeTarget = ref<string | null>(null)

const roleChangeMember = computed(() => roleChangeTarget.value ? store.state.members.find(m => m.id === roleChangeTarget.value) ?? null : null)
const removeTargetMember = computed(() => removeTarget.value ? store.state.members.find(m => m.id === removeTarget.value) ?? null : null)

const groupSummary = computed(() => {
  const map = new Map<string, number>()
  for (const m of store.state.members) {
    const g = m.group || '未分组'
    map.set(g, (map.get(g) ?? 0) + 1)
  }
  return [...map.entries()].map(([name, count]) => ({ name, count }))
})

function roleLabel(role?: string) {
  return role === 'OWNER' ? '管理员' : '学生'
}

function saveGroup(id: string) {
  store.updateMemberGroup(id, groups[id]?.trim() || '未分组')
}

function openRoleChange(memberId: string) {
  roleChangeTarget.value = memberId
  const member = store.state.members.find(m => m.id === memberId)
  newRole.value = member?.role === 'OWNER' ? 'STUDENT' : 'OWNER'
}

function handleRoleChange() {
  if (!roleChangeTarget.value) return
  store.updateMemberRole(roleChangeTarget.value, newRole.value)
  roleChangeTarget.value = null
}

function openRemoveMember(memberId: string) {
  removeTarget.value = memberId
}

function handleRemoveMember() {
  if (!removeTarget.value) return
  store.removeMember(removeTarget.value)
  removeTarget.value = null
}
</script>
