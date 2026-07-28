<template>
  <main class="login-page">
    <section class="login-panel" aria-live="polite">
      <p class="eyebrow">数字商贸实训</p>
      <h1>进入工作台</h1>
      <p class="muted">登录后可继续使用已授权的实训功能。</p>

      <p v-if="bootstrapLoading" data-bootstrap-loading class="muted">正在检查管理员开通状态...</p>

      <form v-else-if="bootstrapAvailable" data-bootstrap-form class="form-panel" @submit.prevent="handleBootstrap">
        <h2>开通管理员账号</h2>
        <label class="field">账号<input v-model="bootstrapIdentifier" data-bootstrap-identifier autocomplete="username" maxlength="64" required type="text"></label>
        <label class="field">显示名称<input v-model="bootstrapDisplayName" data-bootstrap-display-name autocomplete="name" maxlength="40" required type="text"></label>
        <label class="field">密码<input v-model="bootstrapPassword" data-bootstrap-password autocomplete="new-password" minlength="3" required type="password"></label>
        <p v-if="auth.state.value.error" data-auth-error class="form-error" role="alert">{{ auth.state.value.error }}</p>
        <button data-bootstrap-submit class="primary-button" type="submit" :disabled="auth.state.value.loading">
          {{ auth.state.value.loading ? '开通中...' : '开通并进入' }}
        </button>
      </form>

      <form v-else data-login-form class="form-panel" @submit.prevent="handleLogin">
        <h2>账号登录</h2>
        <label class="field">账号<input v-model="identifier" data-login-identifier autocomplete="username" required type="text"></label>
        <label class="field">密码<input v-model="password" data-login-password autocomplete="current-password" required type="password"></label>
        <p v-if="auth.state.value.error" data-auth-error class="form-error" role="alert">{{ auth.state.value.error }}</p>
        <button data-login-submit class="primary-button" type="submit" :disabled="auth.state.value.loading">
          {{ auth.state.value.loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthSession } from '~/composables/useAuthSession'
import { usePracticumStore } from '~/composables/usePracticumStore'

const auth = useAuthSession()
const store = usePracticumStore()
const router = useRouter()
const bootstrapLoading = ref(true)
const bootstrapAvailable = ref(false)
const identifier = ref('')
const password = ref('')
const bootstrapIdentifier = ref('')
const bootstrapDisplayName = ref('')
const bootstrapPassword = ref('')

onMounted(async () => {
  const user = await auth.load()
  if (user) {
    store.switchRole(user.role)
    await router.replace('/practicum')
    return
  }
  try {
    const response = await $fetch<{ available: boolean }>('/api/auth/bootstrap')
    bootstrapAvailable.value = response.available
  } finally {
    bootstrapLoading.value = false
  }
})

async function complete(user: Awaited<ReturnType<typeof auth.login>>) {
  if (!user) return
  store.switchRole(user.role)
  await router.push('/practicum')
}

async function handleLogin() {
  await complete(await auth.login(identifier.value, password.value))
}

async function handleBootstrap() {
  await complete(await auth.bootstrapOwner(bootstrapIdentifier.value, bootstrapDisplayName.value, bootstrapPassword.value))
}
</script>

<style scoped>
.login-page { align-items: center; background: #f4f7f8; display: flex; justify-content: center; min-height: 100vh; padding: 24px; }
.login-panel { background: #ffffff; border: 1px solid #d8e0e2; box-sizing: border-box; max-width: 420px; padding: 32px; width: 100%; }
.login-panel h1 { margin: 4px 0 8px; }
.login-panel h2 { font-size: 20px; margin: 0; }
.form-panel { margin-top: 24px; }
.primary-button { width: 100%; }
@media (max-width: 480px) { .login-page { align-items: flex-start; padding: 16px; } .login-panel { padding: 24px 20px; } }
</style>
