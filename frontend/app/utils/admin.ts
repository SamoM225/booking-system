import type { AdminData, BookingStatus, WorkingDay } from '~/types/admin'

export const statusLabels: Record<BookingStatus, string> = {
  confirmed: 'Confirmed', pending: 'Pending', completed: 'Completed', cancelled: 'Cancelled'
}
export const statusColors = {
  confirmed: 'primary', pending: 'warning', completed: 'success', cancelled: 'neutral'
} as const
export function shiftDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}
export function formatAdminDate(value: string, short = false) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: short ? 'short' : 'long', year: short ? undefined : 'numeric', timeZone: 'UTC'
  }).format(new Date(`${value}T12:00:00Z`))
}
export function defaultSchedule(): WorkingDay[] {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((label, i) => ({
    day: label.toLowerCase(), label, enabled: i < 5, open: '09:00', close: '17:00'
  }))
}
export function createAdminDemo(): AdminData {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bratislava' }).format(new Date())
  const clients = [
    ['Emma', 'Wilson'], ['James', 'Miller'], ['Olivia', 'Taylor'], ['Noah', 'Martin'],
    ['Sophia', 'Clark'], ['Liam', 'Anderson'], ['Amelia', 'Brown'], ['Oliver', 'Davis']
  ]
  const members = [
    { id: 'demo-alice', name: 'Alice Morgan', email: 'alice@example.com', role: 'admin' as const, active: true },
    { id: 'demo-bob', name: 'Bob Williams', email: 'bob@example.com', role: 'worker' as const, active: true },
    { id: 'demo-charlie', name: 'Charlie Davis', email: 'charlie@example.com', role: 'worker' as const, active: true }
  ]
  return {
    today,
    categories: [{ id: 1, name: 'Haircut' }, { id: 2, name: 'Massage' }, { id: 3, name: 'Manicure' }],
    services: [
      { id: 1, categoryId: 1, name: 'Cut & styling', description: 'A fresh cut, finished your way.', duration: 45, active: true },
      { id: 2, categoryId: 2, name: 'Relaxing massage', description: 'A little time to slow down and unwind.', duration: 60, active: true },
      { id: 3, categoryId: 3, name: 'Classic manicure', description: 'Everyday care, beautifully finished.', duration: 30, active: true },
      { id: 4, categoryId: 1, name: 'Hair consultation', description: 'Find the right look with your specialist.', duration: 30, active: true },
      { id: 5, categoryId: 2, name: 'Deep tissue massage', description: 'Focused care for tired muscles.', duration: 60, active: false }
    ],
    members,
    bookings: Array.from({ length: 24 }, (_, i) => {
      const client = clients[i % clients.length]!
      return {
        id: 1041 + i, serviceId: i % 4 + 1, userId: members[i % 3]!.id,
        date: shiftDate(today, i < 8 ? 0 : i < 16 ? 1 : -(i % 5 + 1)),
        time: ['09:00', '09:30', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'][i % 8]!,
        firstName: client[0]!, lastName: client[1]!, email: `${client[0]!.toLowerCase()}@example.com`,
        phone: '+421 900 000 000', note: i === 0 ? 'First visit. A short consultation would be lovely.' : '',
        status: i >= 16 ? (i === 23 ? 'cancelled' : 'completed') : i % 4 === 2 ? 'pending' : 'confirmed'
      }
    }),
    schedules: Object.fromEntries(members.map(member => [member.id, defaultSchedule()])),
    closures: [{ id: 1, date: shiftDate(today, 14), reason: 'Team training' }]
  }
}
