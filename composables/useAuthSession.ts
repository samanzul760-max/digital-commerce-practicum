import type { AuthUser } from '~/server/utils/auth-store'
import type { PracticumRole } from '~/domain/practicum/types'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  loaded: boolean
}

const pendingAuthLoads = new WeakMap<object, Promise<AuthUser | null>>()

export function useAuthSession() {
  const state = useState<AuthState>('practicum-auth-session', () => ({
    user: null,
    loading: false,
    error: null,
    loaded: false,
  }))

  async function load() {
    if (state.value.loaded) return state.value.user
    const pending = pendingAuthLoads.get(state)
    if (pending) return await pending

    state.value.loading = true
    state.value.error = null
    const request = (async () => {
      try {
        const response = await $fetch<{ user: AuthUser }>('/api/auth/session', {
          headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
        })
        state.value.user = response.user
      } catch {
        state.value.user = null
      } finally {
        state.value.loading = false
        state.value.loaded = true
      }
      return state.value.user
    })()
    pendingAuthLoads.set(state, request)
    try {
      return await request
    } finally {
      pendingAuthLoads.delete(state)
    }
  }

  async function authenticate(path: string, body: Record<string, string>, fallbackError: string) {
    state.value.loading = true
    state.value.error = null
    try {
      const response = await $fetch<{ user: AuthUser }>(path, { method: 'POST', body })
      state.value.user = response.user
      state.value.loaded = true
      return response.user
    } catch {
      state.value.user = null
      state.value.error = path === '/api/auth/bootstrap-owner'
        ? '管理员开通失败：账号可能已存在，或账号格式不符合要求，请换一个未使用的字母、数字或下划线账号。'
        : fallbackError
      return null
    } finally {
      state.value.loading = false
    }
  }

  function login(identifier: string, password: string) {
    return authenticate('/api/auth/login', { identifier, password }, '账号或密码错误，请重新输入。')
  }

  function bootstrapOwner(identifier: string, displayName: string, password: string) {
    return authenticate('/api/auth/bootstrap-owner', { identifier, displayName, password }, '管理员开通失败，请检查输入后重试。')
  }

  function enterDemo() {
    return authenticate('/api/auth/demo-entry', {}, '演示入口暂未开启，请联系管理员。')
  }

  async function switchRole(role: PracticumRole) {
    state.value.loading = true
    state.value.error = null
    try {
      const response = await $fetch<{ user: AuthUser }>('/api/auth/switch-role', {
        method: 'POST',
        headers: useCsrfHeaders(),
        body: { role },
      })
      state.value.user = response.user
      state.value.loaded = true
      return response.user
    } finally {
      state.value.loading = false
    }
  }

  async function updateProfile(displayName: string) {
    state.value.loading = true
    state.value.error = null
    try {
      const response = await $fetch<{ user: AuthUser }>('/api/auth/profile', {
        method: 'PATCH',
        headers: useCsrfHeaders(),
        body: { displayName },
      })
      state.value.user = response.user
      state.value.loaded = true
      return response.user
    } catch {
      state.value.error = '资料保存失败，请检查名称后重试。'
      return null
    } finally {
      state.value.loading = false
    }
  }

  async function logout() {
    state.value.loading = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST', headers: useCsrfHeaders() })
    } finally {
      state.value.user = null
      state.value.loaded = true
      state.value.loading = false
    }
  }

  return { state, load, login, bootstrapOwner, enterDemo, switchRole, updateProfile, logout }
}
