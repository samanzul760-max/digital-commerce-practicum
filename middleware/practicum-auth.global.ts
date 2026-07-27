export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/practicum') || to.path === '/practicum/profile') return
  const auth = useAuthSession()
  await auth.load()
  if (!auth.state.value.user) return navigateTo('/practicum/profile')
})
