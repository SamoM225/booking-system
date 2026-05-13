export type BookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled'
export type TeamRole = 'admin' | 'worker'

export interface AdminBooking {
  id: number
  serviceId: number
  userId: string
  date: string
  time: string
  firstName: string
  lastName: string
  email: string
  phone: string
  note: string
  status: BookingStatus
}
export interface AdminCategory { id: number, name: string }
export interface AdminService {
  id: number
  categoryId: number
  name: string
  description: string
  duration: number
  price: number
  active: boolean
}
export interface AdminMember {
  id: string
  name: string
  email: string
  role: TeamRole
  active: boolean
}
export interface WorkingDay {
  day: string
  label: string
  enabled: boolean
  open: string
  close: string
}
export interface Closure { id: number, date: string, reason: string }
export interface AdminData {
  today: string
  bookings: AdminBooking[]
  categories: AdminCategory[]
  services: AdminService[]
  members: AdminMember[]
  schedules: Record<string, WorkingDay[]>
  closures: Closure[]
}

/** Calendar (/calendar API): admins get the whole team, workers only themselves. */
export interface CalendarMember extends AdminMember { serviceIds: number[] }
export interface CalendarService { id: number, name: string, duration: number, price: number, active: boolean }
/** One-off unavailability, local `YYYY-MM-DDTHH:mm`; the end of a day is the next day's 00:00. */
export interface TimeOff { id: number, userId: string, from: string, to: string, reason: string }
export interface CalendarData {
  members: CalendarMember[]
  services: CalendarService[]
  schedules: Record<string, WorkingDay[]>
  bookings: AdminBooking[]
  timeOff: TimeOff[]
  closures: Closure[]
}
