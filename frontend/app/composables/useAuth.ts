export interface AuthUser { id: string, email: string, name: string, role: string }

export function useAuth() {
  const api = useApi()
  const user = useState<AuthUser | null>('auth-user', () => null)
  const checked = useState('auth-checked', () => false)

  async function fetchUser() {
    try {
      user.value = await api<AuthUser>('/auth/me')
    } catch {
      user.value = null
    }
    checked.value = true
    return user.value
  }
  async function login(email: string, password: string) {
    const result = await api<{ user: AuthUser }>('/auth/login', { method: 'POST', body: { email, password } })
    user.value = result.user
    checked.value = true
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
  }
  return { user, checked, fetchUser, login, logout, isAdmin: computed(() => user.value?.role === 'admin') }
}
