import type { AdminBooking, AdminCategory, AdminData, AdminMember, AdminService, Closure, WorkingDay } from '~/types/admin'

const emptyData = (): AdminData => ({
  today: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bratislava' }).format(new Date()),
  bookings: [], categories: [], services: [], members: [], schedules: {}, closures: []
})

/** Admin data and actions backed by the API. Mutations throw on failure (use apiErrorMessage). */
export function useAdmin() {
  const api = useApi()
  const toast = useToast()
  const data = useState<AdminData>('admin-data', emptyData)
  const loaded = useState('admin-loaded', () => false)
  const saved = (title: string) => toast.add({ title, icon: 'i-lucide-circle-check', color: 'success' })
  const serviceName = (id: number) => data.value.services.find(item => item.id === id)?.name ?? 'Unknown service'
  const memberName = (id: string) => data.value.members.find(item => item.id === id)?.name ?? 'Unknown specialist'
  const upsert = <T extends { id: number | string }>(list: T[], item: T) => {
    const index = list.findIndex(entry => entry.id === item.id)
    if (index < 0) list.push(item)
    else list[index] = item
  }

  async function load() {
    const [bookings, categories, services, members, schedules, closures] = await Promise.all([
      api<AdminBooking[]>('/admin/bookings'),
      api<AdminCategory[]>('/admin/categories'),
      api<AdminService[]>('/admin/services'),
      api<AdminMember[]>('/admin/team'),
      api<Record<string, WorkingDay[]>>('/admin/availability'),
      api<Closure[]>('/admin/closures')
    ])
    data.value = { ...emptyData(), bookings, categories, services, members, schedules, closures }
    loaded.value = true
  }

  async function saveBooking(booking: AdminBooking) {
    const { id, ...body } = booking
    const result = await api<AdminBooking>(id ? `/admin/bookings/update/${id}` : '/admin/bookings/create', { method: 'POST', body })
    upsert(data.value.bookings, result)
    saved(id ? 'Booking updated' : 'Booking created')
  }
  async function saveService(service: AdminService) {
    const { id, ...body } = service
    const result = await api<AdminService>(id ? `/admin/services/update/${id}` : '/admin/services/create', { method: 'POST', body })
    upsert(data.value.services, result)
    saved('Service saved')
  }
  async function saveCategory(category: AdminCategory) {
    const result = await api<AdminCategory>(category.id ? `/admin/categories/update/${category.id}` : '/admin/categories/create', { method: 'POST', body: { name: category.name } })
    upsert(data.value.categories, result)
    saved('Category saved')
  }
  async function saveMember(member: AdminMember) {
    const { id, ...body } = member
    const result = await api<AdminMember>(`/admin/team/update/${id}`, { method: 'POST', body })
    upsert(data.value.members, result)
    saved('Team member saved')
  }
  /** Invite a new team member. The backend invite logic (e-mail, accepting) is implemented separately. */
  async function inviteMember(invite: { name: string, email: string, role: AdminMember['role'] }) {
    await api('/admin/team/invite', { method: 'POST', body: invite })
    await load()
    saved('Invitation sent')
  }
  async function saveSchedule(id: string, days: WorkingDay[]) {
    data.value.schedules[id] = await api<WorkingDay[]>(`/admin/availability/${id}`, { method: 'POST', body: days })
    saved('Working hours saved')
  }
  async function addClosure(closure: { date: string, reason: string }) {
    data.value.closures.push(await api<Closure>('/admin/closures/create', { method: 'POST', body: closure }))
    data.value.closures.sort((a, b) => a.date.localeCompare(b.date))
    saved('Closure added')
  }
  async function removeClosure(id: number) {
    await api(`/admin/closures/delete/${id}`, { method: 'DELETE' })
    data.value.closures = data.value.closures.filter(item => item.id !== id)
    saved('Closure removed')
  }

  return { data, loaded, load, saved, serviceName, memberName, saveBooking, saveService, saveCategory, saveMember, inviteMember, saveSchedule, addClosure, removeClosure }
}
