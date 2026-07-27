import type { AuthUser } from '~/server/utils/auth-store'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  loaded: boolean
}

export function useAuthSession() {
  const state = useState<AuthState>('practicum-auth-session', () => ({
    user: null,
    loading: false,
    error: null,
    loaded: false,
  }))

  async function load() {
    if (state.value.loaded || state.value.loading) return state.value.user
    state.value.loading = true
    state.value.error = null
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
  }

  async function login(identifier: string, password: string) {
    state.value.loading = true
    state.value.error = null
    try {
      const response = await $fetch<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: { identifier, password },
      })
      state.value.user = response.user
      state.value.loaded = true
      return response.user
    } catch {
      state.value.user = null
      state.value.error = '账号或密码错误，请重新输入。'
      return null
    } finally {
      state.value.loading = false
    }
  }

  async function logout() {
    state.value.loading = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      state.value.user = null
      state.value.loaded = true
      state.value.loading = false
    }
  }

  return { state, load, login, logout }
}
