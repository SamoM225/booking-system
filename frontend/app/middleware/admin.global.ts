// Everything under /admin needs a signed-in administrator
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || import.meta.server) return
  const { user, checked, fetchUser } = useAuth()
  if (!checked.value) await fetchUser()
  if (user.value?.role !== 'admin') return navigateTo('/login')
})
