<template>
  <ClientOnly>
    <PracticumShell context-title="账号与权限" context-meta="登录、身份和会话状态">
      <div data-profile-page class="profile-page">
        <NuxtLink to="/practicum" data-back-link class="ghost-button">返回工作台</NuxtLink>

        <div class="page-heading" style="margin-top: 22px">
          <div>
            <p class="eyebrow">账号登录</p>
            <h1>进入实训工作台</h1>
            <p>登录后才能访问计划、课程、成员和学习数据。</p>
          </div>
        </div>

        <section v-if="!auth.state.value.user" data-login-panel class="account-panel">
          <form data-login-form class="form-panel" @submit.prevent="handleLogin">
            <h2>登录账号</h2>
            <p class="muted">使用已分配的账号进入所属实训室。</p>
            <label class="field">账号<input data-login-identifier v-model="identifier" autocomplete="username" required type="text"></label>
            <label class="field">密码<input data-login-password v-model="password" autocomplete="current-password" required type="password"></label>
            <p v-if="auth.state.value.error" data-auth-error class="form-error" role="alert">{{ auth.state.value.error }}</p>
            <button data-login-submit class="primary-button" type="submit" :disabled="auth.state.value.loading">
              {{ auth.state.value.loading ? '登录中…' : '登录' }}
            </button>
          </form>
        </section>

        <section v-else data-authenticated-user class="account-panel" aria-live="polite">
          <div class="account-avatar" aria-hidden="true">{{ auth.state.value.user.displayName.slice(0, 1) }}</div>
          <div>
            <h2>{{ auth.state.value.user.displayName }}</h2>
            <p>当前身份：{{ roleLabel }}</p>
            <p class="muted">已连接 {{ auth.state.value.user.roomIds.length }} 个实训室</p>
          </div>
          <button data-logout class="secondary-button" type="button" :disabled="auth.state.value.loading" @click="handleLogout">退出登录</button>
        </section>

        <section v-if="auth.state.value.user" data-identity-choices class="identity-section">
          <h2>工作区视角</h2>
          <p>当前账号的角色权限由服务端确定；这里保留已有原型的视角预览，便于验收学生端和管理端页面。</p>
          <div data-role-options class="identity-list">
            <button
              :data-role-option="'STUDENT'"
              :data-role-current="store.state.activeRole === 'STUDENT' ? 'true' : undefined"
              class="identity-card"
              :class="{ 'identity-card-active': store.state.activeRole === 'STUDENT' }"
              type="button"
              @click="selectRole('STUDENT')"
            >
              <span class="identity-copy"><strong>学生</strong><span>学习已发布计划并提交实践任务</span></span>
              <span class="identity-state">{{ store.state.activeRole === 'STUDENT' ? '当前视角' : '进入' }}</span>
            </button>
          </div>
        </section>

        <section v-if="auth.state.value.user" data-management-group class="identity-section">
          <h2>管理视角</h2>
          <div class="identity-list">
            <button
              data-role-option="OWNER"
              :data-role-current="store.state.activeRole === 'OWNER' ? 'true' : undefined"
              class="identity-card"
              :class="{ 'identity-card-active': store.state.activeRole === 'OWNER' }"
              type="button"
              @click="selectRole('OWNER')"
            >
              <span class="identity-copy"><strong>管理员</strong><span>管理教学计划、成员、资源和审核</span></span>
              <span class="identity-state">{{ store.state.activeRole === 'OWNER' ? '当前视角' : '进入' }}</span>
            </button>
          </div>
        </section>
      </div>
    </PracticumShell>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthSession } from '~/composables/useAuthSession'
import { usePracticumStore } from '~/composables/usePracticumStore'

const auth = useAuthSession()
const store = usePracticumStore()
const router = useRouter()
const identifier = ref('')
const password = ref('')

const roleLabels = { OWNER: '管理员', TEACHER: '教师', MENTOR: '导师', STUDENT: '学生' } as const
const roleLabel = computed(() => auth.state.value.user ? roleLabels[auth.state.value.user.role] : '')

onMounted(() => auth.load())

async function handleLogin() {
  const user = await auth.login(identifier.value, password.value)
  if (!user) return
  store.switchRole(user.role)
  await router.push('/practicum')
}

async function handleLogout() {
  await auth.logout()
  store.resetDemo()
  await router.push('/practicum/login')
}

function selectRole(role: 'OWNER' | 'STUDENT') {
  store.switchRole(role)
  router.push('/practicum')
}
</script>
