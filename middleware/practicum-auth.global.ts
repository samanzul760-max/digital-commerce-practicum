export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthSession()
  await auth.load()
  const user = auth.state.value.user
  const destination = user?.role === 'ADMIN' ? '/admin' : '/center'

  if (to.path === '/login') return user ? navigateTo(destination) : undefined
  if (to.path.startsWith('/practicum')) return navigateTo(user ? legacyDestination(to.path, user.role === 'STUDENT' ? 'STUDENT' : 'ADMIN') : '/login')
  if (to.path.startsWith('/admin')) {
    if (!user) return navigateTo('/login')
    if (user.role !== 'ADMIN') return navigateTo('/center')
  }
  if (to.path.startsWith('/center')) {
    if (!user) return navigateTo('/login')
    if (user.role !== 'STUDENT') return navigateTo('/admin')
  }
})

function legacyDestination(path: string, role: 'ADMIN' | 'STUDENT') {
  if (path.startsWith('/practicum/reviews') || path.startsWith('/practicum/submissions')) return role === 'ADMIN' ? '/admin/reviews' : '/center'
  if (path.startsWith('/practicum/competitions')) return role === 'ADMIN' ? '/admin/competitions' : '/center'
  if (path.startsWith('/practicum/tasks') || path.startsWith('/practicum/assignments')) return role === 'ADMIN' ? '/admin/tasks' : '/center/assignments'
  if (path.startsWith('/practicum/progress') || path.startsWith('/practicum/data')) return role === 'ADMIN' ? '/admin/data' : '/center/data'
  return role === 'ADMIN' ? '/admin?migrated=practicum' : '/center?migrated=practicum'
}
