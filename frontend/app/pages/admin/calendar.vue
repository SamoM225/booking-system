<script setup lang="ts">
import type { AdminBooking, TimeOff } from '~/types/admin'
import { shiftDate } from '~/utils/admin'
import type { CalendarView, GridColumn, GridDraft, GridEvent, MonthItem } from '~/utils/calendar'
import {
  bratislavaNow, datesBetween, dayOfMonth, DAY_MINUTES, daysBetween, formatDayShort, formatRange, fromMinutes, joinDateTime,
  memberPalette, shiftDateTime, splitDateTime, stepDate, toMinutes, viewRange, viewTitle, weekdayShort, workingHours
} from '~/utils/calendar'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { isAdmin, user } = useAuth()
const { data, loading, load, reload, moveBooking, saveTimeOff, serviceOf, memberName } = useCalendar()

const views: Array<{ label: string, value: CalendarView }> = [
  { label: 'Day', value: 'day' }, { label: 'Week', value: 'week' }, { label: 'Month', value: 'month' }
]
const now = ref(bratislavaNow())
const queryString = (key: string) => typeof route.query[key] === 'string' ? route.query[key] as string : ''
const view = ref<CalendarView>(views.some(item => item.value === queryString('view')) ? queryString('view') as CalendarView : 'week')
const date = ref(/^\d{4}-\d{2}-\d{2}$/.test(queryString('date')) ? queryString('date') : now.value.date)
// Workers always see only themselves, the backend enforces it too
const member = ref(isAdmin.value ? queryString('member') || 'all' : user.value?.id ?? '')
const loadError = ref('')

const range = computed(() => viewRange(view.value, date.value))
const dates = computed(() => datesBetween(range.value.from, range.value.to))
const filterUserId = computed(() => member.value === 'all' ? undefined : member.value)
const title = computed(() => viewTitle(view.value, date.value))
// Admin + all specialists + one day = one column per specialist
const byMember = computed(() => view.value === 'day' && !filterUserId.value)

const memberItems = computed(() => [
  { label: 'All specialists', value: 'all' },
  ...data.value.members.map(item => ({ label: item.active ? item.name : `${item.name} (inactive)`, value: item.id }))
])
const visibleMembers = computed(() => data.value.members.filter(item => filterUserId.value
  ? item.id === filterUserId.value
  : item.active || data.value.bookings.some(booking => booking.userId === item.id) || data.value.timeOff.some(entry => entry.userId === item.id)))
const tone = (userId: string) => memberPalette[Math.max(0, data.value.members.findIndex(item => item.id === userId)) % memberPalette.length]!
const closures = computed(() => Object.fromEntries(data.value.closures.map(item => [item.date, item.reason])))

async function fetchRange() {
  try {
    await load(range.value.from, range.value.to, filterUserId.value)
    loadError.value = ''
  } catch (e) {
    loadError.value = apiErrorMessage(e, 'Could not load the calendar.')
  }
}
watch([() => range.value.from, () => range.value.to, filterUserId], fetchRange)
watch([view, date, member], () => {
  router.replace({ query: { ...route.query, view: view.value, date: date.value, member: isAdmin.value && member.value !== 'all' ? member.value : undefined } })
})

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (!queryString('view') && window.innerWidth < 768) view.value = 'day'
  fetchRange()
  timer = setInterval(() => {
    now.value = bratislavaNow()
  }, 60_000)
})
onBeforeUnmount(() => clearInterval(timer))

// ---------- Absolute time, for overlap checks across days ----------
const EPOCH = '2000-01-03'
const absolute = (day: string, minutes: number) => daysBetween(EPOCH, day) * DAY_MINUTES + minutes
const absoluteDateTime = (value: string) => {
  const { date: day, minutes } = splitDateTime(value)
  return absolute(day, minutes)
}
const bookingSpan = (booking: AdminBooking) => {
  const start = absolute(booking.date, toMinutes(booking.time))
  return [start, start + (serviceOf(booking.serviceId)?.duration ?? 30)] as const
}
const overlaps = (a: readonly [number, number], b: readonly [number, number]) => a[0] < b[1] && b[0] < a[1]

/** Last day an unavailability covers (one ending at midnight does not cover the next day). */
const lastDay = (item: TimeOff) => {
  const to = splitDateTime(item.to)
  return to.minutes === 0 ? shiftDate(to.date, -1) : to.date
}
/** All-day or spanning several days: dragged by whole days only. */
const isDayOnly = (item: TimeOff) => (item.from.endsWith('T00:00') && item.to.endsWith('T00:00')) || lastDay(item) !== item.from.slice(0, 10)

// ---------- Time grid (day / week) ----------
function mergedHours(day: string, userIds: string[]) {
  const hours = userIds.map(id => workingHours(data.value.schedules[id], day)).filter(item => item !== null)
  if (!hours.length) return null
  return { open: Math.min(...hours.map(item => item.open)), close: Math.max(...hours.map(item => item.close)) }
}

const columns = computed<GridColumn[]>(() => {
  if (byMember.value) {
    return visibleMembers.value.map(item => ({
      key: `${date.value}|${item.id}`,
      date: date.value,
      userId: item.id,
      title: item.name,
      subtitle: item.role === 'admin' ? 'Administrator' : 'Specialist',
      today: date.value === now.value.date,
      closure: closures.value[date.value],
      hours: workingHours(data.value.schedules[item.id], date.value)
    }))
  }
  const ids = filterUserId.value ? [filterUserId.value] : visibleMembers.value.map(item => item.id)
  return dates.value.map(day => ({
    key: `${day}|${filterUserId.value ?? ''}`,
    date: day,
    userId: filterUserId.value,
    title: view.value === 'day' ? formatDayShort(day) : `${weekdayShort(day)} ${dayOfMonth(day)}`,
    subtitle: view.value === 'day' && filterUserId.value ? memberName(filterUserId.value) : undefined,
    today: day === now.value.date,
    closure: closures.value[day],
    hours: mergedHours(day, ids)
  }))
})

const columnKey = (day: string, userId: string) => byMember.value ? `${day}|${userId}` : `${day}|${filterUserId.value ?? ''}`
const showMember = computed(() => !filterUserId.value && !byMember.value)
const firstName = (userId: string) => memberName(userId).split(' ')[0]

// Items waiting for the server after a drop (b<id> / t<id>)
const pending = ref(new Set<string>())

const bookingEvents = computed<GridEvent[]>(() => data.value.bookings.map((booking) => {
  const service = serviceOf(booking.serviceId)
  const start = toMinutes(booking.time)
  const end = start + (service?.duration ?? 30)
  const group = `b${booking.id}`
  return {
    key: group,
    group,
    kind: 'booking',
    id: booking.id,
    column: columnKey(booking.date, booking.userId),
    start,
    end,
    title: `${booking.firstName} ${booking.lastName}`,
    subtitle: `${formatRange(start, end)} · ${service?.name ?? 'Service'}${showMember.value ? ` · ${firstName(booking.userId)}` : ''}`,
    tone: tone(booking.userId).block,
    muted: booking.status === 'cancelled',
    dashed: booking.status === 'pending',
    editable: booking.status !== 'cancelled',
    pending: pending.value.has(group),
    resizeStart: false,
    resizeEnd: false
  }
}))

// Unavailability split into one segment per visible day
function timeOffSegments(item: TimeOff) {
  const from = splitDateTime(item.from)
  const to = splitDateTime(item.to)
  return dates.value.flatMap((day) => {
    const start = day === from.date ? from.minutes : day > from.date ? 0 : null
    const end = day === to.date ? to.minutes : day < to.date ? DAY_MINUTES : null
    if (start === null || end === null || start >= end) return []
    return [{ day, start, end, first: day === from.date, last: day === lastDay(item) }]
  })
}

const timeOffEvents = computed<GridEvent[]>(() => data.value.timeOff.flatMap((item) => {
  const group = `t${item.id}`
  const dayOnly = isDayOnly(item)
  return timeOffSegments(item).map(segment => ({
    key: `${group}-${segment.day}`,
    group,
    kind: 'timeOff' as const,
    id: item.id,
    column: columnKey(segment.day, item.userId),
    start: segment.start,
    end: segment.end,
    title: item.reason || 'Unavailable',
    subtitle: `${segment.start === 0 && segment.end === DAY_MINUTES ? 'All day' : formatRange(segment.start, segment.end)}${showMember.value ? ` · ${firstName(item.userId)}` : ''}`,
    tone: 'calendar-time-off border-slate-400 text-slate-700 dark:border-slate-500 dark:text-slate-200',
    editable: true,
    pending: pending.value.has(group),
    resizeStart: segment.first,
    resizeEnd: segment.last,
    dayOnly
  }))
}))

const gridEvents = computed(() => [...timeOffEvents.value, ...bookingEvents.value])

// Visible hours: working hours of everyone shown plus anything booked or blocked outside of them
const hourRange = computed(() => {
  const opens: number[] = []
  const closes: number[] = []
  for (const column of columns.value) {
    if (column.hours) {
      opens.push(column.hours.open)
      closes.push(column.hours.close)
    }
  }
  for (const event of gridEvents.value) {
    // All-day / multi-day blocks would stretch the grid to 00-24
    if (event.dayOnly) continue
    opens.push(event.start)
    closes.push(event.end)
  }
  const start = opens.length ? Math.floor(Math.min(...opens) / 60) - 1 : 7
  const end = closes.length ? Math.ceil(Math.max(...closes) / 60) + 1 : 19
  return { start: Math.max(0, Math.min(start, 8)), end: Math.min(24, Math.max(end, 17)) }
})

// ---------- Month ----------
const monthItems = computed<MonthItem[]>(() => [
  ...data.value.bookings.map(booking => ({
    key: `b${booking.id}`,
    group: `b${booking.id}`,
    kind: 'booking' as const,
    id: booking.id,
    date: booking.date,
    time: booking.time,
    title: `${booking.firstName} ${booking.lastName}`,
    dot: tone(booking.userId).dot,
    muted: booking.status === 'cancelled',
    editable: booking.status !== 'cancelled',
    pending: pending.value.has(`b${booking.id}`)
  })),
  ...data.value.timeOff.flatMap(item => timeOffSegments(item).map(segment => ({
    key: `t${item.id}-${segment.day}`,
    group: `t${item.id}`,
    kind: 'timeOff' as const,
    id: item.id,
    date: segment.day,
    time: segment.start === 0 && segment.end === DAY_MINUTES ? 'All day' : segment.start === 0 ? `–${fromMinutes(segment.end)}` : fromMinutes(segment.start),
    title: `${showMember.value ? `${firstName(item.userId)}: ` : ''}${item.reason || 'Unavailable'}`,
    dot: 'bg-slate-400',
    editable: true,
    pending: pending.value.has(`t${item.id}`),
    span: { from: item.from.slice(0, 10), to: lastDay(item) }
  })))
])

// ---------- Where a drop would put an item ----------
function movedTimeOff(item: TimeOff, event: GridEvent, column: GridColumn, minutes: number) {
  const delta = daysBetween(event.column.slice(0, 10), column.date) * DAY_MINUTES + (minutes - event.start)
  return { userId: column.userId ?? item.userId, from: shiftDateTime(item.from, delta), to: shiftDateTime(item.to, delta) }
}
function resizedTimeOff(item: TimeOff, event: GridEvent, start: number, end: number) {
  const day = event.column.slice(0, 10)
  return {
    from: event.resizeStart && start !== event.start ? joinDateTime(day, start) : item.from,
    to: event.resizeEnd && end !== event.end ? joinDateTime(day, end) : item.to
  }
}

/** Why a booking / unavailability of `userId` cannot take this time, based on what is loaded (the server has the final say). */
function conflict(userId: string, span: readonly [number, number], ignore: { booking?: number, timeOff?: number }, kind: GridEvent['kind']) {
  const booked = data.value.bookings.some(item => item.userId === userId && item.id !== ignore.booking && item.status !== 'cancelled' && overlaps(bookingSpan(item), span))
  if (booked) return kind === 'booking' ? 'Overlaps another booking' : 'Overlaps a booking'
  const off = data.value.timeOff.some(item => item.userId === userId && item.id !== ignore.timeOff && overlaps([absoluteDateTime(item.from), absoluteDateTime(item.to)], span))
  if (off) return kind === 'booking' ? 'Specialist is unavailable then' : 'Overlaps another unavailability'
  return null
}

function validateGrid({ event, column, start, end }: GridDraft) {
  if (event.kind === 'booking') {
    const booking = data.value.bookings.find(item => item.id === event.id)
    if (!booking) return null
    if (closures.value[column.date]) return `Closed · ${closures.value[column.date]}`
    const userId = column.userId ?? booking.userId
    const startAt = absolute(column.date, start)
    return conflict(userId, [startAt, startAt + (end - start)], { booking: booking.id }, 'booking')
  }
  const item = data.value.timeOff.find(entry => entry.id === event.id)
  if (!item) return null
  const isMove = end - start === event.end - event.start && (start !== event.start || column.key !== event.column)
  const next = isMove ? movedTimeOff(item, event, column, start) : { userId: item.userId, ...resizedTimeOff(item, event, start, end) }
  return conflict(next.userId, [absoluteDateTime(next.from), absoluteDateTime(next.to)], { timeOff: item.id }, 'timeOff')
}

function validateMonth({ item, date: target, days }: { item: MonthItem, date: string, days: number }) {
  if (item.kind === 'booking') {
    const booking = data.value.bookings.find(entry => entry.id === item.id)
    if (!booking) return null
    if (closures.value[target]) return `Closed · ${closures.value[target]}`
    const startAt = absolute(target, toMinutes(booking.time))
    return conflict(booking.userId, [startAt, startAt + (serviceOf(booking.serviceId)?.duration ?? 30)], { booking: booking.id }, 'booking')
  }
  const entry = data.value.timeOff.find(value => value.id === item.id)
  if (!entry) return null
  const shift = days * DAY_MINUTES
  return conflict(entry.userId, [absoluteDateTime(entry.from) + shift, absoluteDateTime(entry.to) + shift], { timeOff: entry.id }, 'timeOff')
}

// ---------- Editors ----------
const bookingOpen = ref(false)
const selectedBooking = ref<AdminBooking | null>(null)
const bookingDefaults = ref<Partial<AdminBooking>>()
const timeOffOpen = ref(false)
const selectedTimeOff = ref<TimeOff | null>(null)
const timeOffDefaults = ref<{ userId?: string, date: string, time: string, endDate?: string, endTime?: string, allDay?: boolean }>()

type Slot = { date: string, time: string, userId?: string, endDate?: string, endTime?: string, allDay?: boolean }
const chooser = ref<Slot | null>(null)
const chooserOpen = computed({
  get: () => chooser.value !== null,
  set: (value) => {
    if (!value) chooser.value = null
  }
})
const chooserDescription = computed(() => {
  const slot = chooser.value
  if (!slot) return ''
  const when = slot.allDay
    ? 'All day'
    : slot.endTime ? `${slot.time} – ${slot.endDate && slot.endDate !== slot.date ? `${formatDayShort(slot.endDate)} ` : ''}${slot.endTime}` : `at ${slot.time}`
  return `${formatDayShort(slot.date)} · ${when}${slot.userId ? ` · ${memberName(slot.userId)}` : ''}`
})

// The range that was clicked or dragged stays visible until its chooser / editor closes
const selection = ref<{ column: string, start: number, end: number } | null>(null)
const monthSelection = ref<{ from: string, to: string } | null>(null)
watch([chooserOpen, bookingOpen, timeOffOpen], (open) => {
  if (open.every(value => !value)) {
    selection.value = null
    monthSelection.value = null
  }
})

function defaultSlot(): Slot {
  const day = range.value.from <= now.value.date && now.value.date <= range.value.to ? now.value.date : range.value.from
  return { date: view.value === 'day' ? date.value : day, time: '09:00', userId: filterUserId.value }
}
function newBooking(slot: Slot = defaultSlot()) {
  chooser.value = null
  selectedBooking.value = null
  bookingDefaults.value = { date: slot.date, time: slot.time, ...(slot.userId ? { userId: slot.userId } : {}) }
  bookingOpen.value = true
}
function newTimeOff(slot: Slot = defaultSlot()) {
  chooser.value = null
  selectedTimeOff.value = null
  timeOffDefaults.value = { ...slot }
  timeOffOpen.value = true
}
function openItem(kind: 'booking' | 'timeOff', id: number) {
  if (kind === 'booking') {
    selectedBooking.value = data.value.bookings.find(item => item.id === id) ?? null
    bookingOpen.value = Boolean(selectedBooking.value)
  } else {
    selectedTimeOff.value = data.value.timeOff.find(item => item.id === id) ?? null
    timeOffOpen.value = Boolean(selectedTimeOff.value)
  }
}

function onCreate({ column, minutes }: { column: GridColumn, minutes: number }) {
  selection.value = { column: column.key, start: minutes, end: minutes + 30 }
  chooser.value = { date: column.date, time: fromMinutes(minutes), userId: column.userId }
}
function onSelect({ column, start, end }: { column: GridColumn, start: number, end: number }) {
  selection.value = { column: column.key, start, end }
  const to = splitDateTime(joinDateTime(column.date, end))
  chooser.value = { date: column.date, time: fromMinutes(start), userId: column.userId, endDate: to.date, endTime: fromMinutes(to.minutes) }
}
function onMonthCreate(day: string) {
  monthSelection.value = { from: day, to: day }
  chooser.value = { date: day, time: '09:00', userId: filterUserId.value, allDay: true }
}
// Several days dragged in the month view: that can only be time off
function onMonthSelect({ from, to }: { from: string, to: string }) {
  monthSelection.value = { from, to }
  newTimeOff({ date: from, time: '09:00', endDate: to, allDay: true, userId: filterUserId.value })
}

// ---------- Drag & drop: optimistic update, rolled back with an animation when the server says no ----------
const timeGrid = useTemplateRef<{ revert: (group: string, restore: () => void) => Promise<void> }>('timeGrid')
const monthGrid = useTemplateRef<{ revert: (group: string, restore: () => void) => Promise<void> }>('monthGrid')

async function commit<T extends object>(group: string, item: T, changes: Partial<T>, request: () => Promise<unknown>, title: string) {
  const before = { ...item }
  Object.assign(item, changes)
  pending.value = new Set(pending.value).add(group)
  try {
    await request()
  } catch (e) {
    const restore = () => {
      Object.assign(item, before)
    }
    const grid = view.value === 'month' ? monthGrid.value : timeGrid.value
    await (grid ? grid.revert(group, restore) : restore())
    toast.add({ title, description: apiErrorMessage(e), icon: 'i-lucide-circle-alert', color: 'error' })
    reload().catch(() => {})
  } finally {
    const next = new Set(pending.value)
    next.delete(group)
    pending.value = next
  }
}

function onInvalid(message: string) {
  toast.add({ title: message, description: 'Nothing was changed.', icon: 'i-lucide-triangle-alert', color: 'warning' })
}

function onMove({ event, column, minutes }: { event: GridEvent, column: GridColumn, minutes: number }) {
  if (event.kind === 'booking') {
    const booking = data.value.bookings.find(item => item.id === event.id)
    if (!booking) return
    const target = { date: column.date, time: fromMinutes(minutes), ...(column.userId && column.userId !== booking.userId ? { userId: column.userId } : {}) }
    return commit(event.group, booking, target, () => moveBooking(booking.id, target), 'Could not move the booking')
  }
  const item = data.value.timeOff.find(entry => entry.id === event.id)
  if (!item) return
  const changes = movedTimeOff(item, event, column, minutes)
  return commit(event.group, item, changes, () => saveTimeOff({ ...item, ...changes }), 'Could not move the unavailability')
}

function onResize({ event, start, end }: { event: GridEvent, start: number, end: number }) {
  const item = data.value.timeOff.find(entry => entry.id === event.id)
  if (!item) return
  const changes = resizedTimeOff(item, event, start, end)
  if (changes.to <= changes.from) return
  return commit(event.group, item, changes, () => saveTimeOff({ ...item, ...changes }), 'Could not resize the unavailability')
}

function onMonthMove({ item, date: target, days }: { item: MonthItem, date: string, days: number }) {
  if (item.kind === 'booking') {
    const booking = data.value.bookings.find(entry => entry.id === item.id)
    if (!booking) return
    return commit(item.group, booking, { date: target }, () => moveBooking(booking.id, { date: target, time: booking.time }), 'Could not move the booking')
  }
  const entry = data.value.timeOff.find(value => value.id === item.id)
  if (!entry) return
  const changes = { from: shiftDateTime(entry.from, days * DAY_MINUTES), to: shiftDateTime(entry.to, days * DAY_MINUTES) }
  return commit(item.group, entry, changes, () => saveTimeOff({ ...entry, ...changes }), 'Could not move the unavailability')
}

function openDay(day: string) {
  date.value = day
  view.value = 'day'
}
</script>

<template>
  <div>
    <AdminPageHeading
      eyebrow="Calendar"
      :title="isAdmin ? 'The whole team, at a glance.' : 'Your days, at a glance.'"
      :description="isAdmin ? 'See every specialist’s appointments, drag them to a new time and block time off.' : 'See your appointments, drag them to a new time and block your time off.'"
    >
      <UButton
        label="Add unavailability"
        icon="i-lucide-calendar-off"
        color="neutral"
        variant="outline"
        size="lg"
        class="rounded-xl"
        @click="newTimeOff()"
      />
      <UButton
        label="New booking"
        icon="i-lucide-plus"
        size="lg"
        class="rounded-xl"
        @click="newBooking()"
      />
    </AdminPageHeading>

    <section class="rounded-2xl border border-default bg-default">
      <div class="flex flex-wrap items-center gap-3 border-b border-default p-4 sm:p-5">
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-chevron-left"
            :aria-label="`Previous ${view}`"
            color="neutral"
            variant="ghost"
            @click="date = stepDate(view, date, -1)"
          />
          <UButton
            label="Today"
            color="neutral"
            variant="outline"
            size="sm"
            @click="date = now.date"
          />
          <UButton
            icon="i-lucide-chevron-right"
            :aria-label="`Next ${view}`"
            color="neutral"
            variant="ghost"
            @click="date = stepDate(view, date, 1)"
          />
        </div>
        <h2
          class="min-w-0 flex-1 truncate text-lg font-semibold text-highlighted max-sm:order-first max-sm:basis-full"
          aria-live="polite"
        >
          {{ title }}
        </h2>
        <UIcon
          v-if="loading"
          name="i-lucide-loader-circle"
          class="size-4 animate-spin text-muted"
          aria-label="Loading"
        />
        <USelect
          v-if="isAdmin"
          v-model="member"
          :items="memberItems"
          aria-label="Show specialist"
          class="w-48"
        />
        <UFieldGroup>
          <UButton
            v-for="item in views"
            :key="item.value"
            :label="item.label"
            :color="view === item.value ? 'primary' : 'neutral'"
            :variant="view === item.value ? 'solid' : 'outline'"
            size="sm"
            :aria-pressed="view === item.value"
            @click="view = item.value"
          />
        </UFieldGroup>
      </div>

      <UAlert
        v-if="loadError"
        color="error"
        variant="subtle"
        :description="loadError"
        class="m-5 w-auto"
      />
      <template v-else>
        <CalendarMonthGrid
          v-if="view === 'month'"
          ref="monthGrid"
          :dates="dates"
          :month="date.slice(0, 7)"
          :today="now.date"
          :items="monthItems"
          :closures="closures"
          :highlight="monthSelection"
          :validate="validateMonth"
          @create="onMonthCreate"
          @select="onMonthSelect"
          @open="item => openItem(item.kind, item.id)"
          @day="openDay"
          @move="onMonthMove"
          @invalid="onInvalid"
        />
        <AdminEmptyState
          v-else-if="!columns.length"
          title="Nobody to show"
          description="There are no active specialists in the team yet."
          icon="i-lucide-users-round"
        />
        <CalendarTimeGrid
          v-else
          ref="timeGrid"
          :columns="columns"
          :events="gridEvents"
          :start-hour="hourRange.start"
          :end-hour="hourRange.end"
          :now="now"
          :highlight="selection"
          :validate="validateGrid"
          @create="onCreate"
          @select="onSelect"
          @open="event => openItem(event.kind, event.id)"
          @move="onMove"
          @resize="onResize"
          @invalid="onInvalid"
        />
      </template>

      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-default px-5 py-3 text-xs text-muted">
        <template v-if="isAdmin && !filterUserId">
          <span
            v-for="item in visibleMembers"
            :key="item.id"
            class="flex items-center gap-1.5"
          ><span
            class="size-2 rounded-full"
            :class="tone(item.id).dot"
          />{{ item.name }}</span>
        </template>
        <span class="flex items-center gap-1.5"><span class="h-3 w-4 rounded-sm border border-dashed border-current" />Pending</span>
        <span class="flex items-center gap-1.5"><span class="line-through">Abc</span>Cancelled</span>
        <span class="flex items-center gap-1.5"><span class="calendar-time-off h-3 w-4 rounded-sm" />Unavailable</span>
        <span class="ml-auto hidden sm:inline">Click or drag on empty space to add · drag a block to move it · drag its edges to resize</span>
      </div>
    </section>

    <UModal
      v-model:open="chooserOpen"
      title="Add to the calendar"
      :description="chooserDescription"
    >
      <template #body>
        <div
          v-if="chooser"
          class="grid gap-3 sm:grid-cols-2"
        >
          <button
            type="button"
            class="flex flex-col items-start gap-2 rounded-xl border border-default p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
            @click="newBooking(chooser)"
          >
            <UIcon
              name="i-lucide-calendar-plus"
              class="size-6 text-primary"
            />
            <span class="font-semibold">Booking</span>
            <span class="text-xs text-muted">{{ chooser.endTime || chooser.allDay ? `Starts ${chooser.time}, the service sets its length.` : 'An appointment with a client.' }}</span>
          </button>
          <button
            type="button"
            class="flex flex-col items-start gap-2 rounded-xl border border-default p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
            @click="newTimeOff(chooser)"
          >
            <UIcon
              name="i-lucide-calendar-off"
              class="size-6 text-primary"
            />
            <span class="font-semibold">Unavailability</span>
            <span class="text-xs text-muted">Time off, nobody can book it.</span>
          </button>
        </div>
      </template>
    </UModal>

    <CalendarBookingEditor
      v-model:open="bookingOpen"
      :booking="selectedBooking"
      :defaults="bookingDefaults"
    />
    <CalendarTimeOffEditor
      v-model:open="timeOffOpen"
      :time-off="selectedTimeOff"
      :defaults="timeOffDefaults"
    />
  </div>
</template>
