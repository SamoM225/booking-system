import type { AdminBooking, AdminCategory, AdminData, AdminInvitation, AdminMember, AdminService, Closure, WorkingDay } from '~/types/admin'

type Identified = { id: number | string }

const todayInBratislava = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bratislava' }).format(new Date())

const emptyData = (): AdminData => ({
  today: todayInBratislava(),
  bookings: [],
  categories: [],
  services: [],
  members: [],
  schedules: {},
  closures: [],
  invitations: []
})

function upsert<T extends Identified>(list: T[], item: T) {
  const index = list.findIndex(entry => entry.id === item.id)
  if (index < 0) {
    list.push(item)
  } else {
    list[index] = item
  }
}

/** Admin data and actions backed by the API. Mutations throw on failure (use apiErrorMessage). */
export function useAdmin() {
  const api = useApi()
  const toast = useToast()
  const data = useState<AdminData>('admin-data', emptyData)
  const loaded = useState('admin-loaded', () => false)

  function saved(title: string) {
    toast.add({ title, icon: 'i-lucide-circle-check', color: 'success' })
  }

  function serviceName(id: number) {
    return data.value.services.find(service => service.id === id)?.name ?? 'Unknown service'
  }

  function memberName(id: string) {
    return data.value.members.find(member => member.id === id)?.name ?? 'Unknown specialist'
  }

  /** POST /resource when the item is new, PUT /resource/:id when it already exists. */
  function save<T>(resource: string, id: number | string | undefined, body: object) {
    return api<T>(id ? `/admin/${resource}/${id}` : `/admin/${resource}`, { method: id ? 'PUT' : 'POST', body })
  }

  async function load() {
    const [bookings, categories, services, members, schedules, closures, invitations] = await Promise.all([
      api<AdminBooking[]>('/admin/bookings'),
      api<AdminCategory[]>('/admin/categories'),
      api<AdminService[]>('/admin/services'),
      api<AdminMember[]>('/admin/team'),
      api<Record<string, WorkingDay[]>>('/admin/availability'),
      api<Closure[]>('/admin/closures'),
      api<AdminInvitation[]>('/admin/team/invitations')
    ])
    data.value = { ...emptyData(), bookings, categories, services, members, schedules, closures, invitations }
    loaded.value = true
  }

  async function saveBooking({ id, ...body }: AdminBooking) {
    upsert(data.value.bookings, await save<AdminBooking>('bookings', id, body))
    saved(id ? 'Booking updated' : 'Booking created')
  }

  async function saveService({ id, ...body }: AdminService) {
    upsert(data.value.services, await save<AdminService>('services', id, body))
    saved('Service saved')
  }

  async function saveCategory({ id, name }: AdminCategory) {
    upsert(data.value.categories, await save<AdminCategory>('categories', id, { name }))
    saved('Category saved')
  }

  async function removeCategory(id: number) {
    await api(`/admin/categories/${id}`, { method: 'DELETE' })
    data.value.categories = data.value.categories.filter(category => category.id !== id)
    saved('Category removed')
  }

  async function saveMember({ id, ...body }: AdminMember) {
    upsert(data.value.members, await save<AdminMember>('team', id, body))
    saved('Team member saved')
  }

  /** E-mail an invitation link; the person joins the team after setting their password on /invite/:token. */
  async function inviteMember(invite: { name: string, email: string, role: AdminMember['role'] }) {
    const created = await api<AdminInvitation>('/admin/team/invite', { method: 'POST', body: invite })
    // Re-inviting an address replaces its previous pending invitation
    data.value.invitations = [created, ...data.value.invitations.filter(item => item.email !== created.email)]
    saved(`Invitation sent to ${created.email}`)
  }

  /** New link and expiry, the previous link stops working. */
  async function resendInvitation(id: number) {
    upsert(data.value.invitations, await api<AdminInvitation>(`/admin/team/invitations/${id}/resend`, { method: 'POST' }))
    saved('Invitation sent again')
  }

  async function revokeInvitation(id: number) {
    await api(`/admin/team/invitations/${id}`, { method: 'DELETE' })
    data.value.invitations = data.value.invitations.filter(item => item.id !== id)
    saved('Invitation revoked')
  }

  async function saveSchedule(userId: string, days: WorkingDay[]) {
    data.value.schedules[userId] = await api<WorkingDay[]>(`/admin/availability/${userId}`, { method: 'PUT', body: days })
    saved('Working hours saved')
  }

  async function addClosure(closure: { date: string, reason: string }) {
    const created = await api<Closure>('/admin/closures', { method: 'POST', body: closure })
    data.value.closures = [...data.value.closures, created].sort((a, b) => a.date.localeCompare(b.date))
    saved('Closure added')
  }

  async function removeClosure(id: number) {
    await api(`/admin/closures/${id}`, { method: 'DELETE' })
    data.value.closures = data.value.closures.filter(closure => closure.id !== id)
    saved('Closure removed')
  }

  return {
    data,
    loaded,
    load,
    saved,
    serviceName,
    memberName,
    saveBooking,
    saveService,
    saveCategory,
    removeCategory,
    saveMember,
    inviteMember,
    resendInvitation,
    revokeInvitation,
    saveSchedule,
    addClosure,
    removeClosure
  }
}
