import type { AdminBooking, CalendarData, TimeOff } from '~/types/admin'
import { formatDayShort } from '~/utils/calendar'

const emptyData = (): CalendarData => ({ members: [], services: [], schedules: {}, bookings: [], timeOff: [], closures: [] })

/** `reload: false` leaves refreshing to the caller (drag & drop batches it until every drop is saved). */
interface SaveOptions { reload?: boolean }

/**
 * Calendar data and actions backed by /calendar. The backend scopes everything to the signed-in member:
 * admins see and manage the whole team, workers only themselves. Mutations throw on failure (use apiErrorMessage).
 */
export function useCalendar() {
  const api = useApi()
  const toast = useToast()
  const { isAdmin } = useAuth()
  const admin = useAdmin()
  const data = useState<CalendarData>('calendar-data', emptyData)
  const range = useState<{ from: string, to: string, userId?: string } | null>('calendar-range', () => null)
  const loading = useState('calendar-loading', () => false)
  // Shared by every component using the calendar, so the newest request wins no matter who started it
  const request = useState('calendar-request', () => 0)
  // Id of the request whose data is shown (ids grow with every load that starts)
  const applied = useState('calendar-applied', () => 0)

  function saved(title: string) {
    toast.add({ title, icon: 'i-lucide-circle-check', color: 'success' })
  }

  /** Resolves to false when a newer request replaced this one, so its data was thrown away. */
  async function load(from: string, to: string, userId?: string) {
    range.value = { from, to, userId }
    const current = ++request.value
    loading.value = true
    try {
      const query = { from, to, ...(userId ? { userId } : {}) }
      const result = await api<CalendarData>('/calendar', { query })
      // A newer request (the user kept clicking) wins
      if (current !== request.value) return false
      data.value = result
      applied.value = current
      return true
    } finally {
      if (current === request.value) loading.value = false
    }
  }

  function reload() {
    return range.value ? load(range.value.from, range.value.to, range.value.userId) : Promise.resolve(false)
  }

  /** Keep the admin pages (bookings table, overview) in sync without a full reload. */
  function syncAdmin(booking: AdminBooking | null, removedId?: number) {
    if (!isAdmin.value || !admin.loaded.value) return
    const list = admin.data.value.bookings.filter(item => item.id !== (booking?.id ?? removedId))
    admin.data.value.bookings = booking ? [...list, booking] : list
  }

  async function saveBooking({ id, ...body }: AdminBooking) {
    const booking = await api<AdminBooking>(id ? `/calendar/bookings/${id}` : '/calendar/bookings', { method: id ? 'PUT' : 'POST', body })
    syncAdmin(booking)
    await reload()
    saved(id ? 'Booking updated' : 'Booking created')
  }

  async function moveBooking(id: number, target: { date: string, time: string, userId?: string }, options: SaveOptions = {}) {
    const booking = await api<AdminBooking>(`/calendar/bookings/${id}/move`, { method: 'PATCH', body: target })
    syncAdmin(booking)
    saved(`Booking moved to ${formatDayShort(booking.date)} at ${booking.time}`)
    if (options.reload !== false) await reload()
    return booking
  }

  async function removeBooking(id: number) {
    await api(`/calendar/bookings/${id}`, { method: 'DELETE' })
    syncAdmin(null, id)
    await reload()
    saved('Booking deleted')
  }

  async function saveTimeOff({ id, ...body }: Omit<TimeOff, 'id'> & { id?: number }, options: SaveOptions = {}) {
    const timeOff = await api<TimeOff>(id ? `/calendar/time-off/${id}` : '/calendar/time-off', { method: id ? 'PUT' : 'POST', body })
    saved(id ? 'Unavailability updated' : 'Unavailability added')
    if (options.reload !== false) await reload()
    return timeOff
  }

  async function removeTimeOff(id: number) {
    await api(`/calendar/time-off/${id}`, { method: 'DELETE' })
    await reload()
    saved('Unavailability removed')
  }

  function serviceOf(id: number) {
    return data.value.services.find(service => service.id === id)
  }

  function memberName(id: string) {
    return data.value.members.find(member => member.id === id)?.name ?? 'Unknown specialist'
  }

  return { data, loading, request, applied, load, reload, saveBooking, moveBooking, removeBooking, saveTimeOff, removeTimeOff, serviceOf, memberName }
}
