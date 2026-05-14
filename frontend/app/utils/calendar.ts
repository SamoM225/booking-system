import type { WorkingDay } from '~/types/admin'
import { shiftDate } from '~/utils/admin'

// All calendar values are local Europe/Bratislava wall-clock strings, dates are handled at UTC noon so no timezone shifts creep in
export type CalendarView = 'day' | 'week' | 'month'

export const DAY_MINUTES = 24 * 60
export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const pad = (n: number) => String(n).padStart(2, '0')
const noon = (date: string) => new Date(`${date}T12:00:00Z`)

export const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
export const fromMinutes = (total: number) => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`

/** Monday = 0 … Sunday = 6 */
export const weekdayIndex = (date: string) => (noon(date).getUTCDay() + 6) % 7
export const weekdayName = (date: string) => WEEKDAYS[weekdayIndex(date)]!
export const startOfWeek = (date: string) => shiftDate(date, -weekdayIndex(date))
export const daysBetween = (from: string, to: string) => Math.round((noon(to).getTime() - noon(from).getTime()) / 86400000)

/** First and last day shown by a view around `date` (the month view is a full 6-week grid). */
export function viewRange(view: CalendarView, date: string) {
  if (view === 'day') return { from: date, to: date }
  if (view === 'week') {
    const from = startOfWeek(date)
    return { from, to: shiftDate(from, 6) }
  }
  const from = startOfWeek(`${date.slice(0, 7)}-01`)
  return { from, to: shiftDate(from, 41) }
}

export function datesBetween(from: string, to: string) {
  return Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => shiftDate(from, i))
}

/** Move a date by one step of the view (day, week or month). */
export function stepDate(view: CalendarView, date: string, direction: number) {
  if (view === 'day') return shiftDate(date, direction)
  if (view === 'week') return shiftDate(date, 7 * direction)
  const value = noon(`${date.slice(0, 7)}-01`)
  value.setUTCMonth(value.getUTCMonth() + direction)
  return value.toISOString().slice(0, 10)
}

const format = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(noon(date))

export function viewTitle(view: CalendarView, date: string) {
  if (view === 'day') return format(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (view === 'month') return format(date, { month: 'long', year: 'numeric' })
  const { from, to } = viewRange('week', date)
  const sameMonth = from.slice(0, 7) === to.slice(0, 7)
  return `${format(from, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })} – ${format(to, { day: 'numeric', month: sameMonth ? 'long' : 'short', year: 'numeric' })}`
}

export const weekdayShort = (date: string) => format(date, { weekday: 'short' })
export const dayOfMonth = (date: string) => Number(date.slice(8, 10))
export const formatDayShort = (date: string) => format(date, { weekday: 'short', day: 'numeric', month: 'short' })

/** Current local date and minute in Bratislava. */
export function bratislavaNow() {
  const value = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Bratislava' })
  return { date: value.slice(0, 10), minutes: toMinutes(value.slice(11, 16)) }
}

/** `YYYY-MM-DDTHH:mm` helpers; 24:00 is written as the next day's 00:00. */
export function joinDateTime(date: string, minutes: number) {
  const days = Math.floor(minutes / DAY_MINUTES)
  return `${shiftDate(date, days)}T${fromMinutes(minutes - days * DAY_MINUTES)}`
}
export const splitDateTime = (value: string) => ({ date: value.slice(0, 10), minutes: toMinutes(value.slice(11, 16)) })
export function shiftDateTime(value: string, minutes: number) {
  const { date, minutes: start } = splitDateTime(value)
  return joinDateTime(date, start + minutes)
}

/** Opening hours of a weekday, or null on a day off. */
export function workingHours(schedule: WorkingDay[] | undefined, date: string) {
  const day = schedule?.find(item => item.day === weekdayName(date))
  return day?.enabled ? { open: toMinutes(day.open), close: toMinutes(day.close) } : null
}

/** One distinct colour per specialist, in the order they appear in the team. */
export const memberPalette = [
  { block: 'bg-blue-50 border-blue-500 text-blue-950 dark:bg-blue-500/15 dark:text-blue-50', dot: 'bg-blue-500' },
  { block: 'bg-violet-50 border-violet-500 text-violet-950 dark:bg-violet-500/15 dark:text-violet-50', dot: 'bg-violet-500' },
  { block: 'bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-50', dot: 'bg-emerald-500' },
  { block: 'bg-amber-50 border-amber-500 text-amber-950 dark:bg-amber-500/15 dark:text-amber-50', dot: 'bg-amber-500' },
  { block: 'bg-rose-50 border-rose-500 text-rose-950 dark:bg-rose-500/15 dark:text-rose-50', dot: 'bg-rose-500' },
  { block: 'bg-cyan-50 border-cyan-500 text-cyan-950 dark:bg-cyan-500/15 dark:text-cyan-50', dot: 'bg-cyan-500' },
  { block: 'bg-fuchsia-50 border-fuchsia-500 text-fuchsia-950 dark:bg-fuchsia-500/15 dark:text-fuchsia-50', dot: 'bg-fuchsia-500' },
  { block: 'bg-lime-50 border-lime-600 text-lime-950 dark:bg-lime-500/15 dark:text-lime-50', dot: 'bg-lime-600' }
] as const

/** A column of the time grid: one day, optionally of one specialist. */
export interface GridColumn {
  key: string
  date: string
  userId?: string
  title: string
  subtitle?: string
  today: boolean
  /** Business closure reason */
  closure?: string
  /** Working hours in minutes; null = day off, undefined = do not shade */
  hours?: { open: number, close: number } | null
}

/** A block in the time grid. Multi-day unavailability is split into one segment per day. */
export interface GridEvent {
  key: string
  /** Same for every segment of one item (b<id> / t<id>), used to dim, animate and focus them together */
  group: string
  kind: 'booking' | 'timeOff'
  id: number
  column: string
  /** Minutes from midnight of the column's date */
  start: number
  end: number
  title: string
  subtitle: string
  tone: string
  muted?: boolean
  dashed?: boolean
  editable: boolean
  /** Waiting for the server after a drop */
  pending?: boolean
  /** Edges that can be dragged (first / last segment of an unavailability) */
  resizeStart: boolean
  resizeEnd: boolean
  /** All-day or multi-day unavailability: dragging changes the day only, never the time */
  dayOnly?: boolean
  /** Whole range of a day-only item (local YYYY-MM-DDTHH:mm), also the days that are not visible */
  span?: { from: string, to: string }
}

/** An entry in the month view. */
export interface MonthItem {
  key: string
  group: string
  kind: 'booking' | 'timeOff'
  id: number
  date: string
  time: string
  title: string
  dot: string
  muted?: boolean
  editable: boolean
  pending?: boolean
  /** First and last day of a multi-day item, so a drag can show and keep its whole length */
  span?: { from: string, to: string }
}

/** '10:00 – 12:30'; the end of a day is shown as 24:00. */
export const formatRange = (start: number, end: number) =>
  `${fromMinutes(start)} – ${end >= DAY_MINUTES ? '24:00' : fromMinutes(end)}`

/** '2h 30m', '45m', '3h' */
export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ') || '0m'
}

export const prefersReducedMotion = () => import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A proposed new position of a block (move or resize), checked by the page before it is committed. */
export interface GridDraft {
  event: GridEvent
  column: GridColumn
  start: number
  end: number
}
