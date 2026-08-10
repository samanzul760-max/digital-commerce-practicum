export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthSession()
  await auth.load()
  const user = auth.state.value.user
  const destination = user?.role === 'ADMIN' ? '/admin' : '/center'

  if (to.path === '/login') return user ? navigateTo(destination) : undefined
  if (to.path.startsWith('/practicum')) return navigateTo(user ? destination : '/login')
  if (to.path.startsWith('/admin')) {
    if (!user) return navigateTo('/login')
    if (user.role !== 'ADMIN') return navigateTo('/center')
  }
  if (to.path.startsWith('/center')) {
    if (!user) return navigateTo('/login')
    if (user.role !== 'STUDENT') return navigateTo('/admin')
  }
})
