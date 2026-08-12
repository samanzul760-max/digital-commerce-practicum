import type { AuthUser } from '~/server/utils/auth-store'
import type { Organization, TrainingRoom } from '~/domain/practicum/types'

interface WorkspaceContextState {
  user: AuthUser | null
  organization: Organization | null
  room: TrainingRoom | null
  organizations: Organization[]
  loading: boolean
}

const pendingWorkspaceLoads = new WeakMap<object, Promise<WorkspaceContextState>>()

export function useWorkspaceContext() {
  const state = useState<WorkspaceContextState>('practicum-workspace-context', () => ({
    user: null,
    organization: null,
    room: null,
    organizations: [],
    loading: false,
  }))

  async function load() {
    const pending = pendingWorkspaceLoads.get(state)
    if (pending) return await pending

    state.value.loading = true
    const request = (async () => {
      try {
        const context = await $fetch<Omit<WorkspaceContextState, 'loading'>>('/api/practicum/context', {
          headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
        })
        state.value = { ...context, loading: false }
      } catch {
        state.value.loading = false
      }
      return state.value
    })()
    pendingWorkspaceLoads.set(state, request)
    try {
      return await request
    } finally {
      pendingWorkspaceLoads.delete(state)
    }
  }

  async function selectRoom(roomId: string) {
    const organization = state.value.organizations.find(item => item.roomIds.includes(roomId))
    if (!organization || state.value.loading) return false
    state.value.loading = true
    try {
      const context = await $fetch<Omit<WorkspaceContextState, 'loading'>>(`/api/practicum/organizations/${organization.id}/select`, {
        method: 'POST',
        headers: useCsrfHeaders(),
        body: { roomId },
      })
      state.value = { ...context, loading: false }
      return true
    } catch {
      state.value.loading = false
      return false
    }
  }

  return { state, load, selectRoom }
}
