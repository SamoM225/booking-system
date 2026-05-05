import type { BookingStatus, WorkingDay } from '~/types/admin'

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
