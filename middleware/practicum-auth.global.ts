export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/practicum') || to.path === '/practicum/login') return
  const auth = useAuthSession()
  await auth.load()
  if (!auth.state.value.user) return navigateTo('/practicum/login')
})
