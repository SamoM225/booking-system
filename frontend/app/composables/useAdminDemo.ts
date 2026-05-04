import type { AdminBooking, AdminMember, AdminService, WorkingDay } from '~/types/admin'
import { createAdminDemo, defaultSchedule } from '~/utils/admin'

/** Explicit preview adapter. No API calls, credentials, or persistent customer data. */
export function useAdminDemo() {
  const data = useState('admin-demo-v1', createAdminDemo)
  const toast = useToast()
  const nextId = (items: { id: number }[]) => Math.max(0, ...items.map(item => item.id)) + 1
  const saved = (title: string) => toast.add({ title, description: 'Updated in this demo session only.', icon: 'i-lucide-circle-check', color: 'success' })
  const serviceName = (id: number) => data.value.services.find(item => item.id === id)?.name ?? 'Unknown service'
  const memberName = (id: string) => data.value.members.find(item => item.id === id)?.name ?? 'Unknown specialist'
  function saveBooking(booking: AdminBooking) {
    const index = data.value.bookings.findIndex(item => item.id === booking.id)
    if (index < 0) data.value.bookings.push({ ...booking, id: nextId(data.value.bookings) })
    else data.value.bookings[index] = { ...booking }
    saved(index < 0 ? 'Booking created' : 'Booking updated')
  }
  function saveService(service: AdminService) {
    const index = data.value.services.findIndex(item => item.id === service.id)
    if (index < 0) data.value.services.push({ ...service, id: nextId(data.value.services) })
    else data.value.services[index] = { ...service }
    saved('Service saved')
  }
  function saveMember(member: AdminMember) {
    const index = data.value.members.findIndex(item => item.id === member.id)
    if (index < 0) {
      const id = `demo-${crypto.randomUUID()}`
      data.value.members.push({ ...member, id })
      data.value.schedules[id] = defaultSchedule()
    } else data.value.members[index] = { ...member }
    saved('Team member saved')
  }
  function saveSchedule(id: string, days: WorkingDay[]) {
    data.value.schedules[id] = days.map(day => ({ ...day }))
    saved('Working hours saved')
  }
  return { data, saved, nextId, serviceName, memberName, saveBooking, saveService, saveMember, saveSchedule }
}
