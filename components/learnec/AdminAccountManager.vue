<template>
  <section class="accounts" data-account-manager>
    <header><div><p class="eyebrow">工作中心快捷入口</p><h1>学生账号管理</h1></div><button type="button" @click="showForm = !showForm">生成学生账号</button></header>
    <form v-if="showForm" class="account-form" @submit.prevent="createAccount">
      <label>账号<input v-model.trim="form.identifier" required pattern="[A-Za-z0-9_-]{3,64}" /></label>
      <label>姓名<input v-model.trim="form.displayName" required maxlength="40" /></label>
      <label>临时密码（可留空由系统生成）<input v-model="form.temporaryPassword" minlength="8" type="password" /></label>
      <div class="form-actions"><button type="submit" :disabled="saving">{{ saving ? '正在生成' : '确认生成' }}</button><button class="secondary" type="button" @click="showForm = false">取消</button></div>
    </form>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="loading" class="state">正在读取学生账号…</div>
    <div v-else-if="accounts.length === 0" class="state">暂无学生账号。</div>
    <div v-else class="table-wrap"><table><thead><tr><th>账号</th><th>姓名</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody><tr v-for="account in accounts" :key="account.id"><td>{{ account.identifier }}</td><td>{{ account.displayName }}</td><td><span :class="account.enabled ? 'enabled' : 'disabled'">{{ account.enabled ? '启用' : '停用' }}</span></td><td>{{ formatDate(account.createdAt) }}</td><td class="actions"><button class="link-button" type="button" @click="toggleStatus(account)">{{ account.enabled ? '停用' : '启用' }}</button><button class="link-button" type="button" @click="resetPassword(account.id)">重置密码</button></td></tr></tbody></table></div>
  </section>
</template>

<script setup lang="ts">
interface StudentAccount { id: string; identifier: string; displayName: string; enabled: boolean; createdAt: string }
const accounts = ref<StudentAccount[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const showForm = ref(false)
const form = reactive({ identifier: '', displayName: '', temporaryPassword: '' })

async function load() {
  loading.value = true
  error.value = ''
  try { accounts.value = (await $fetch<{ items: StudentAccount[] }>('/api/admin/accounts')).items } catch { error.value = '无法读取学生账号，请稍后重试。' } finally { loading.value = false }
}
async function createAccount() {
  saving.value = true; error.value = ''; notice.value = ''
  try {
    const response = await $fetch<{ account: StudentAccount; temporaryPassword: string }>('/api/admin/accounts', { method: 'POST', headers: useCsrfHeaders(), body: form })
    accounts.value.push(response.account); notice.value = `账号已生成。临时密码：${response.temporaryPassword}`; form.identifier = ''; form.displayName = ''; form.temporaryPassword = ''; showForm.value = false
  } catch { error.value = '账号生成失败。请检查账号格式或是否重复。' } finally { saving.value = false }
}
async function toggleStatus(account: StudentAccount) {
  error.value = ''; notice.value = ''
  try { const response = await $fetch<{ account: StudentAccount }>(`/api/admin/accounts/${account.id}/status`, { method: 'PATCH', headers: useCsrfHeaders(), body: { enabled: !account.enabled } }); Object.assign(account, response.account) } catch { error.value = '账号状态更新失败。' }
}
async function resetPassword(id: string) {
  error.value = ''; notice.value = ''
  try { const response = await $fetch<{ temporaryPassword: string }>(`/api/admin/accounts/${id}/reset-password`, { method: 'POST', headers: useCsrfHeaders() }); notice.value = `临时密码已重置：${response.temporaryPassword}` } catch { error.value = '密码重置失败。' }
}
function formatDate(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }) }
onMounted(load)
</script>

<style scoped>
.accounts{padding:28px;border:1px solid #e4e8ef;border-radius:8px;background:#fff}.accounts header{display:flex;align-items:center;justify-content:space-between;gap:16px}.eyebrow{margin:0 0 6px;color:#145bc2;font-size:12px;font-weight:700}.accounts h1{margin:0;font-size:24px}.accounts button{min-height:36px;padding:0 14px;border:1px solid #1677ff;border-radius:5px;background:#1677ff;color:#fff;font-weight:600;cursor:pointer}.accounts button:disabled{opacity:.6}.account-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:24px 0;padding:20px;background:#f8fafc}.account-form label{display:grid;gap:7px;color:#475467;font-size:13px}.account-form input{height:36px;padding:0 10px;border:1px solid #d0d5dd;border-radius:4px;background:#fff}.form-actions{display:flex;align-items:end;gap:8px}.accounts button.secondary,.accounts .link-button{border-color:#d0d5dd;background:#fff;color:#344054}.notice,.error,.state{margin:18px 0 0;padding:12px 14px;border-radius:4px;font-size:14px}.notice{background:#ecfdf3;color:#067647}.error{background:#fef3f2;color:#b42318}.state{background:#f8fafc;color:#667085}.table-wrap{overflow-x:auto;margin-top:22px}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:13px 10px;border-bottom:1px solid #eaecf0;font-size:14px}th{color:#667085;font-size:12px;font-weight:600}.enabled,.disabled{font-size:13px}.enabled{color:#067647}.disabled{color:#b42318}.actions{display:flex;gap:8px}.accounts .link-button{min-height:30px;padding:0 9px;font-size:12px}@media(max-width:840px){.account-form{grid-template-columns:1fr}.form-actions{align-items:center}.accounts{padding:20px}.accounts header{align-items:flex-start;flex-direction:column}}
</style>
