// Everything under /admin needs a signed-in administrator, workers may only use their calendar
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || import.meta.server) return
  const { user, checked, fetchUser } = useAuth()
  if (!checked.value) await fetchUser()
  if (user.value?.role === 'admin') return
  if (user.value?.role === 'worker') return to.path === '/admin/calendar' ? undefined : navigateTo('/admin/calendar')
  return navigateTo('/login')
})
