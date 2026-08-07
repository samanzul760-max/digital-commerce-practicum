<template>
  <ClientOnly>
    <PracticumShell context-title="成员管理" context-meta="数据库成员、虚拟分组与加入流程">
      <section class="profile-page">
        <div class="page-heading">
          <div>
            <p class="eyebrow">成员与分组</p>
            <h1>成员管理</h1>
            <p>管理当前实训室的成员、角色、虚拟分组、邀请和加入申请。</p>
          </div>
        </div>

        <p v-if="!canManageMembers(store.state.activeRole)" data-forbidden class="empty-state">只有管理员可以管理成员。</p>
        <PracticumStatePanel v-else-if="isLoading" state="loading" title="正在加载成员数据" description="正在从服务端读取当前实训室的成员与加入流程。" />
        <PracticumStatePanel v-else-if="loadError" data-members-error state="error" title="成员数据暂时无法加载" description="请检查服务端连接后重试。" @retry="loadMembers" />

        <template v-else>
          <section class="form-panel paper" data-member-invites>
            <div class="section-heading"><h2>创建邀请</h2></div>
            <div class="form-actions">
              <input v-model="invitee" data-invitee aria-label="受邀用户 ID" placeholder="受邀用户 ID">
              <input v-model="inviteGroupName" data-invite-group-name aria-label="邀请分组" placeholder="分配到的虚拟分组（可选）">
              <button data-create-member-invite class="primary-button" type="button" @click="createInvite">创建邀请</button>
            </div>
            <p v-if="lifecycleError" data-member-lifecycle-error class="empty-state">操作未完成，请重试。</p>
            <p v-if="!invites.length" class="empty-state">当前没有邀请记录。</p>
            <div v-else class="plan-list compact-list">
              <div v-for="invite in invites" :key="invite.id" data-member-invite class="plan-row paper">
                <div class="member-management-identity"><strong>{{ invite.groupName || '未指定分组' }}</strong><span>{{ invite.status }} · {{ invite.invitee }}</span></div>
                <div class="form-actions"><code>{{ invite.code }}</code><button v-if="invite.status === 'ACTIVE'" data-revoke-member-invite class="secondary-button" type="button" @click="revokeInvite(invite.id)">撤销</button></div>
              </div>
            </div>
          </section>

          <section class="form-panel paper" data-join-applications>
            <div class="section-heading"><h2>加入申请</h2><span class="status-pill">{{ applications.length }} 条</span></div>
            <p v-if="!applications.length" class="empty-state">当前没有加入申请。</p>
            <div v-else class="plan-list compact-list">
              <div v-for="application in applications" :key="application.id" data-join-application class="plan-row paper">
                <div class="member-management-identity"><strong>{{ application.applicantLabel }}</strong><span>{{ application.groupName || '未指定分组' }} · {{ application.status }}</span></div>
                <div v-if="application.status === 'PENDING'" class="form-actions"><button data-approve-application class="primary-button" type="button" @click="decideApplication(application.id, 'APPROVED')">批准</button><button data-reject-application class="secondary-button" type="button" @click="decideApplication(application.id, 'REJECTED')">拒绝</button></div>
              </div>
            </div>
          </section>

          <div class="section-heading"><h2>成员列表</h2><span class="status-pill">{{ members.length }} 名成员</span></div>
          <p v-if="!members.length" data-members-empty class="empty-state">当前实训室暂无成员。</p>
          <div v-else class="plan-list">
            <div v-for="member in members" :key="member.id" data-member-row :data-member-id="member.id" class="plan-row member-management-row paper">
              <div class="member-management-identity"><strong :title="member.label">{{ member.label }}</strong><span>{{ roleLabel(member.role) }} · {{ member.group }}</span></div>
              <div class="form-actions member-management-actions"><input v-model="groups[member.id]" data-member-group aria-label="虚拟分组" placeholder="输入分组名称"><button data-save-member-group class="secondary-button" type="button" @click="saveGroup(member.id)">保存分组</button><button data-change-member-role class="secondary-button" type="button" @click="openRoleChange(member.id)">变更角色</button><button data-remove-member class="secondary-button member-remove-button" type="button" @click="openRemoveMember(member.id)">移除</button></div>
            </div>
          </div>

          <div v-if="groupSummary.length" class="member-group-section"><div class="section-heading"><h2>虚拟分组概览</h2></div><div class="member-group-overview"><article v-for="group in groupSummary" :key="group.id" data-member-group-summary class="paper"><strong :title="group.name">{{ group.name }}</strong><span>{{ group.memberCount }} 名成员</span></article></div></div>

          <section v-if="roleChangeTarget" data-role-change-impact class="form-panel paper"><h2>变更成员角色</h2><p>{{ roleChangeMember?.label }} 当前角色：{{ roleLabel(roleChangeMember?.role) }}。变更后该成员将获得不同工作区权限。</p><div class="form-actions"><select v-model="newRole" data-new-role-select><option value="OWNER">管理员</option><option value="STUDENT">学生</option></select><button data-confirm-role-change class="primary-button" type="button" @click="handleRoleChange">确认变更</button><button class="secondary-button" type="button" @click="roleChangeTarget = null">取消</button></div></section>
          <section v-if="removeTarget" data-remove-member-impact class="form-panel paper"><h2>移除成员确认</h2><p>{{ removeTargetMember?.label }} 将被移出当前实训室，其历史统计不再进入班级汇总。</p><div class="form-actions"><button data-confirm-remove-member class="danger-button" type="button" @click="handleRemoveMember">确认移除</button><button class="secondary-button" type="button" @click="removeTarget = null">取消</button></div></section>
        </template>
      </section>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { type PracticumRoomMember, usePracticumServer } from '~/composables/usePracticumServer'
import { useCsrfHeaders } from '~/composables/useCsrfHeaders'
import { usePracticumStore } from '~/composables/usePracticumStore'
import { canManageMembers } from '~/domain/practicum/permissions'

type MemberInvite = { id: string; code: string; status: string; invitee: string; groupName: string }
type JoinApplication = { id: string; applicantLabel: string; groupName: string; status: string }

const store = usePracticumStore()
const server = usePracticumServer()
const members = ref<PracticumRoomMember[]>([])
const groupSummary = ref<Array<{ id: string; name: string; memberCount: number }>>([])
const invites = ref<MemberInvite[]>([])
const applications = ref<JoinApplication[]>([])
const groups = reactive<Record<string, string>>({})
const isLoading = ref(true)
const loadError = ref(false)
const lifecycleError = ref(false)
const invitee = ref('')
const inviteGroupName = ref('')
const roleChangeTarget = ref<string | null>(null)
const newRole = ref<'OWNER' | 'STUDENT'>('STUDENT')
const removeTarget = ref<string | null>(null)
const roomId = computed(() => String(store.state.room.id ?? 'room-001'))
const roleChangeMember = computed(() => members.value.find(member => member.id === roleChangeTarget.value) ?? null)
const removeTargetMember = computed(() => members.value.find(member => member.id === removeTarget.value) ?? null)

async function loadMembers() {
  if (!canManageMembers(store.state.activeRole)) { isLoading.value = false; return }
  isLoading.value = true
  loadError.value = false
  try {
    const [memberResponse, inviteResponse, applicationResponse] = await Promise.all([
      server.listRoomMembers(roomId.value),
      $fetch<{ items: MemberInvite[] }>(`/api/practicum/members/invites?roomId=${encodeURIComponent(roomId.value)}`),
      $fetch<{ items: JoinApplication[] }>(`/api/practicum/members/applications?roomId=${encodeURIComponent(roomId.value)}`),
    ])
    members.value = memberResponse.items
    groupSummary.value = memberResponse.groups
    invites.value = inviteResponse.items
    applications.value = applicationResponse.items
    for (const member of memberResponse.items) groups[member.id] = member.group
  } catch {
    members.value = []
    groupSummary.value = []
    invites.value = []
    applications.value = []
    loadError.value = true
  } finally { isLoading.value = false }
}

function roleLabel(role?: string) { return role === 'OWNER' ? '管理员' : '学生' }

async function createInvite() {
  lifecycleError.value = false
  try {
    await $fetch('/api/practicum/members/invites', { method: 'POST', headers: useCsrfHeaders(), body: { roomId: roomId.value, invitee: invitee.value, groupName: inviteGroupName.value } })
    invitee.value = ''
    inviteGroupName.value = ''
    await loadMembers()
  } catch { lifecycleError.value = true }
}

async function revokeInvite(inviteId: string) {
  lifecycleError.value = false
  try {
    await $fetch(`/api/practicum/members/invites/${encodeURIComponent(inviteId)}/revoke?roomId=${encodeURIComponent(roomId.value)}`, { method: 'POST', headers: useCsrfHeaders() })
    await loadMembers()
  } catch { lifecycleError.value = true }
}

async function decideApplication(applicationId: string, decision: 'APPROVED' | 'REJECTED') {
  lifecycleError.value = false
  try {
    await $fetch(`/api/practicum/members/applications/${encodeURIComponent(applicationId)}/decision`, { method: 'POST', headers: useCsrfHeaders(), body: { roomId: roomId.value, decision } })
    await loadMembers()
  } catch { lifecycleError.value = true }
}

async function saveGroup(id: string) { await server.updateRoomMember(id, roomId.value, { group: groups[id]?.trim() || '未分组' }); await loadMembers() }
function openRoleChange(memberId: string) { roleChangeTarget.value = memberId; newRole.value = roleChangeMember.value?.role === 'OWNER' ? 'STUDENT' : 'OWNER' }
async function handleRoleChange() { if (!roleChangeTarget.value) return; await server.updateRoomMember(roleChangeTarget.value, roomId.value, { role: newRole.value }); roleChangeTarget.value = null; await loadMembers() }
function openRemoveMember(memberId: string) { removeTarget.value = memberId }
async function handleRemoveMember() { if (!removeTarget.value) return; await server.removeRoomMember(removeTarget.value, roomId.value); removeTarget.value = null; await loadMembers() }

onMounted(loadMembers)
</script>
