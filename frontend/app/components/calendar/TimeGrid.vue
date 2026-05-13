<script setup lang="ts">
import type { GridColumn, GridDraft, GridEvent } from '~/utils/calendar'
import { DAY_MINUTES, formatDuration, formatRange, fromMinutes, prefersReducedMotion } from '~/utils/calendar'
import { OUTSIDE_DISTANCE } from '~/composables/usePointerGesture'

const props = withDefaults(defineProps<{
  columns: GridColumn[]
  events: GridEvent[]
  startHour: number
  endHour: number
  now: { date: string, minutes: number }
  snap?: number
  /** Range kept visible while the add chooser / editor for it is open */
  highlight?: { column: string, start: number, end: number } | null
  /** Client-side check of a drop target; returns why it is not allowed */
  validate?: (draft: GridDraft) => string | null
}>(), { snap: 15, highlight: null, validate: undefined })

const emit = defineEmits<{
  /** Plain click on empty space */
  create: [target: { column: GridColumn, minutes: number }]
  /** Press and drag on empty space */
  select: [range: { column: GridColumn, start: number, end: number }]
  open: [event: GridEvent]
  move: [change: { event: GridEvent, column: GridColumn, minutes: number }]
  resize: [change: { event: GridEvent, start: number, end: number }]
  invalid: [message: string]
}>()

const HOUR_HEIGHT = 56
const HOUR_COLUMN = 56
const perMinute = HOUR_HEIGHT / 60
const gridStart = computed(() => props.startHour * 60)
const gridEnd = computed(() => props.endHour * 60)
const height = computed(() => (props.endHour - props.startHour) * HOUR_HEIGHT)
const hours = computed(() => Array.from({ length: props.endHour - props.startHour }, (_, i) => props.startHour + i))
const template = computed(() => `${HOUR_COLUMN}px repeat(${props.columns.length}, minmax(${props.columns.length > 7 ? 130 : 110}px, 1fr))`)

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const y = (minutes: number) => (clamp(minutes, gridStart.value, gridEnd.value) - gridStart.value) * perMinute
const roundTo = (minutes: number) => Math.round(minutes / props.snap) * props.snap
const floorTo = (minutes: number) => Math.floor(minutes / props.snap) * props.snap

const scrollerEl = ref<HTMLElement | null>(null)
const headerEl = ref<HTMLElement | null>(null)
const ghostEl = ref<HTMLElement | null>(null)
const columnEls = new Map<string, HTMLElement>()
function setColumnEl(key: string, el: unknown) {
  if (el) columnEls.set(key, el as HTMLElement)
  else columnEls.delete(key)
}
const columnByKey = (key: string) => props.columns.find(item => item.key === key)

function pointerMinutes(clientY: number, el: HTMLElement) {
  return gridStart.value + (clientY - el.getBoundingClientRect().top) / perMinute
}

function columnAt(clientX: number) {
  let nearest: { key: string, distance: number } | null = null
  for (const [key, el] of columnEls) {
    const rect = el.getBoundingClientRect()
    const distance = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0
    if (!nearest || distance < nearest.distance) nearest = { key, distance }
  }
  return nearest?.key
}

function isOutside(e: PointerEvent) {
  const rect = scrollerEl.value?.getBoundingClientRect()
  if (!rect) return false
  return e.clientX < rect.left - OUTSIDE_DISTANCE || e.clientX > rect.right + OUTSIDE_DISTANCE
    || e.clientY < rect.top - OUTSIDE_DISTANCE || e.clientY > rect.bottom + OUTSIDE_DISTANCE
}

/** A small pointer move keeps the original (possibly off-grid) time, a bigger one snaps to the grid. */
function shifted(value: number, delta: number) {
  return Math.abs(delta) < props.snap / 2 ? value : roundTo(value + delta)
}

// ---------- Side-by-side lanes for overlapping blocks ----------
const positioned = computed(() => {
  const result: Array<GridEvent & { lane: number, lanes: number }> = []
  for (const column of props.columns) {
    const items = props.events
      .filter(event => event.column === column.key && event.end > gridStart.value && event.start < gridEnd.value)
      .sort((a, b) => a.start - b.start || b.end - a.end)
    let cluster: Array<GridEvent & { lane: number, lanes: number }> = []
    let laneEnds: number[] = []
    let clusterEnd = -1
    const close = () => {
      cluster.forEach((item) => {
        item.lanes = laneEnds.length
      })
      result.push(...cluster)
      cluster = []
      laneEnds = []
    }
    for (const event of items) {
      if (event.start >= clusterEnd) close()
      let lane = laneEnds.findIndex(end => end <= event.start)
      if (lane < 0) lane = laneEnds.push(0) - 1
      laneEnds[lane] = event.end
      clusterEnd = Math.max(clusterEnd, event.end)
      cluster.push({ ...event, lane, lanes: 1 })
    }
    close()
  }
  return result
})

// ---------- Gestures: move, resize (top / bottom edge), select a range on empty space ----------
type Payload = { kind: 'move' | 'resize-start' | 'resize-end', event: GridEvent, el: HTMLElement } | { kind: 'select', column: GridColumn }

interface MoveState {
  mode: 'move'
  event: GridEvent
  grabDx: number
  grabDy: number
  width: number
  height: number
  downMinutes: number
  column: string
  start: number
  end: number
  outside: boolean
  invalid: string | null
}
interface ResizeState {
  mode: 'resize-start' | 'resize-end'
  event: GridEvent
  downMinutes: number
  start: number
  end: number
  invalid: string | null
}
interface SelectState {
  mode: 'select'
  column: string
  anchor: number
  start: number
  end: number
}

const g = ref<MoveState | ResizeState | SelectState | null>(null)
const pointer = reactive({ x: 0, y: 0 })

const gesture = usePointerGesture<Payload>({
  cursor: payload => payload.kind === 'move' ? 'grabbing' : payload.kind === 'select' ? 'selecting' : 'resizing',
  scroller: () => scrollerEl.value,
  insets: () => ({ top: headerEl.value?.offsetHeight ?? 0, left: HOUR_COLUMN }),
  start(payload, e, down) {
    hover.value = null
    ghostEl.value?.getAnimations().forEach(animation => animation.cancel())
    if (payload.kind === 'select') {
      const el = columnEls.get(payload.column.key)!
      const anchor = clamp(floorTo(pointerMinutes(down.y, el)), gridStart.value, gridEnd.value - props.snap)
      g.value = { mode: 'select', column: payload.column.key, anchor, start: anchor, end: anchor + props.snap }
      return
    }
    const { event } = payload
    const el = columnEls.get(event.column)!
    const downMinutes = pointerMinutes(down.y, el)
    if (payload.kind === 'move') {
      const rect = payload.el.getBoundingClientRect()
      pointer.x = e.clientX
      pointer.y = e.clientY
      g.value = {
        mode: 'move', event, grabDx: down.x - rect.left, grabDy: down.y - rect.top, width: rect.width, height: rect.height,
        downMinutes, column: event.column, start: event.start, end: event.end, outside: false, invalid: null
      }
      return
    }
    g.value = { mode: payload.kind, event, downMinutes, start: event.start, end: event.end, invalid: null }
  },
  move(e) {
    const state = g.value
    if (!state) return
    pointer.x = e.clientX
    pointer.y = e.clientY
    if (state.mode === 'select') {
      const el = columnEls.get(state.column)
      if (!el) return
      const current = clamp(floorTo(pointerMinutes(e.clientY, el)), gridStart.value, gridEnd.value - props.snap)
      state.start = Math.min(state.anchor, current)
      state.end = Math.max(state.anchor, current) + props.snap
      return
    }
    const { event } = state
    if (state.mode === 'move') {
      state.outside = isOutside(e)
      gesture.setOutside(state.outside)
      const key = columnAt(e.clientX) ?? state.column
      const el = columnEls.get(key)
      if (!el) return
      state.column = key
      state.width = el.getBoundingClientRect().width - 4
      const duration = event.end - event.start
      if (event.dayOnly) {
        // All-day / multi-day unavailability keeps its times, only the day changes
        state.start = event.start
      } else {
        const start = shifted(event.start, pointerMinutes(e.clientY, el) - state.downMinutes)
        state.start = clamp(start, Math.min(gridStart.value, event.start), Math.max(gridEnd.value - duration, event.start))
      }
      state.end = state.start + duration
      const column = columnByKey(key)
      state.invalid = !state.outside && column && props.validate ? props.validate({ event, column, start: state.start, end: state.end }) : null
      return
    }
    const el = columnEls.get(event.column)
    if (!el) return
    const delta = pointerMinutes(e.clientY, el) - state.downMinutes
    // Delta based, so the part of a long block hidden outside the visible hours is kept
    if (state.mode === 'resize-end') {
      state.end = clamp(shifted(event.end, delta), event.start + props.snap, DAY_MINUTES)
    } else {
      state.start = clamp(shifted(event.start, delta), 0, event.end - props.snap)
    }
    const column = columnByKey(event.column)
    state.invalid = column && props.validate ? props.validate({ event, column, start: state.start, end: state.end }) : null
  },
  end() {
    const state = g.value
    if (!state) return
    if (state.mode === 'select') {
      const column = columnByKey(state.column)
      g.value = null
      if (column) emit('select', { column, start: state.start, end: state.end })
      return
    }
    if (state.mode === 'move') {
      const column = columnByKey(state.column)
      const unchanged = state.column === state.event.column && state.start === state.event.start
      if (state.outside || unchanged || !column) return returnGhost(state)
      if (state.invalid) {
        emit('invalid', state.invalid)
        return returnGhost(state)
      }
      g.value = null
      emit('move', { event: state.event, column, minutes: state.start })
      return
    }
    g.value = null
    if (state.invalid) return emit('invalid', state.invalid)
    if (state.start !== state.event.start || state.end !== state.event.end) {
      emit('resize', { event: state.event, start: state.start, end: state.end })
    }
  },
  cancel() {
    const state = g.value
    if (state?.mode === 'move') returnGhost(state)
    else g.value = null
  }
})

// The ghost flies back onto the block it came from, then disappears
function returnGhost(state: MoveState) {
  const ghost = ghostEl.value
  const origin = scrollerEl.value?.querySelector<HTMLElement>(`[data-key="${state.event.key}"]`)
  const done = () => {
    if (g.value === state) g.value = null
  }
  if (!ghost || !origin || prefersReducedMotion()) return done()
  const to = origin.getBoundingClientRect()
  ghost.animate(
    [
      { transform: ghost.style.transform, width: ghost.style.width, height: ghost.style.height },
      { transform: `translate3d(${to.left}px, ${to.top}px, 0)`, width: `${to.width}px`, height: `${to.height}px` }
    ],
    { duration: 180, easing: 'ease-out', fill: 'forwards' }
  ).finished.then(done, done)
}

function onBlockDown(e: PointerEvent, event: GridEvent) {
  if (!event.editable || event.pending) return
  gesture.begin(e, { kind: 'move', event, el: e.currentTarget as HTMLElement })
}

function onHandleDown(e: PointerEvent, event: GridEvent, kind: 'resize-start' | 'resize-end') {
  if (!event.editable || event.pending) return
  gesture.begin(e, { kind, event, el: e.currentTarget as HTMLElement })
}

function onColumnDown(e: PointerEvent, column: GridColumn) {
  gesture.begin(e, { kind: 'select', column })
}

// Click (no drag) on empty space; the click after a drag is swallowed by usePointerGesture
function create(e: MouseEvent, column: GridColumn) {
  const el = columnEls.get(column.key)
  if (!el) return
  const minutes = Math.floor(pointerMinutes(e.clientY, el) / 30) * 30
  emit('create', { column, minutes: clamp(minutes, gridStart.value, gridEnd.value - 30) })
}

// What a block shows right now (a block being resized follows the pointer)
function shown(event: GridEvent) {
  const state = g.value
  return state && state.mode !== 'move' && state.mode !== 'select' && state.event.key === event.key ? state : event
}
const isDimmed = (event: GridEvent) => g.value?.mode === 'move' && g.value.event.group === event.group
const isResizing = (event: GridEvent) => {
  const state = g.value
  return Boolean(state && (state.mode === 'resize-start' || state.mode === 'resize-end') && state.event.key === event.key)
}
const blockHeight = (event: GridEvent) => Math.max(y(shown(event).end) - y(shown(event).start) - 2, 18)

const moveState = computed(() => g.value?.mode === 'move' ? g.value : null)
const ghostLabel = computed(() => {
  const state = moveState.value
  if (!state) return ''
  if (state.outside) return 'Release to cancel'
  if (state.invalid) return state.invalid
  const column = state.column !== state.event.column ? columnByKey(state.column) : undefined
  return `${formatRange(state.start, state.end)}${column ? ` · ${column.title}` : ''}`
})
const resizeState = computed(() => g.value && (g.value.mode === 'resize-start' || g.value.mode === 'resize-end') ? g.value : null)

// ---------- Hover hint on empty space (mouse only) ----------
const hover = ref<{ column: string, minutes: number } | null>(null)
function onColumnHover(e: PointerEvent, column: GridColumn) {
  if (e.pointerType !== 'mouse' || gesture.phase.value !== 'idle' || e.target !== e.currentTarget) {
    hover.value = null
    return
  }
  const el = columnEls.get(column.key)
  if (!el) return
  hover.value = { column: column.key, minutes: clamp(Math.floor(pointerMinutes(e.clientY, el) / 30) * 30, gridStart.value, gridEnd.value - 30) }
}

// ---------- Keyboard: Alt + arrows move a focused block, Alt + Shift + arrows change the end ----------
const announcement = ref('')
function onBlockKey(e: KeyboardEvent, event: GridEvent) {
  if (!e.altKey || !event.editable || event.pending || !e.key.startsWith('Arrow')) return
  e.preventDefault()
  const duration = event.end - event.start
  const vertical = e.key === 'ArrowUp' ? -props.snap : e.key === 'ArrowDown' ? props.snap : 0
  if (e.shiftKey && vertical) {
    if (!event.resizeEnd) return
    const end = clamp(event.end + vertical, event.start + props.snap, DAY_MINUTES)
    if (end !== event.end) emit('resize', { event, start: event.start, end })
    announcement.value = `Ends at ${fromMinutes(end % DAY_MINUTES)}`
  } else if (vertical) {
    if (event.dayOnly) return
    const start = clamp(event.start + vertical, 0, DAY_MINUTES - duration)
    const column = columnByKey(event.column)
    if (!column || start === event.start) return
    emit('move', { event, column, minutes: start })
    announcement.value = `Moved to ${formatRange(start, start + duration)}`
  } else {
    const index = props.columns.findIndex(item => item.key === event.column) + (e.key === 'ArrowLeft' ? -1 : 1)
    const column = props.columns[index]
    if (!column) return
    emit('move', { event, column, minutes: event.start })
    announcement.value = `Moved to ${column.title}, ${formatRange(event.start, event.end)}`
  }
  nextTick(() => scrollerEl.value?.querySelector<HTMLElement>(`[data-group="${event.group}"]`)?.focus())
}

// ---------- Rejected by the server: slide back to where the data says, then shake ----------
async function revert(group: string, restore: () => void) {
  const query = () => [...(scrollerEl.value?.querySelectorAll<HTMLElement>(`[data-group="${group}"]`) ?? [])]
  const before = query().map(el => el.getBoundingClientRect())
  restore()
  await nextTick()
  const reduced = prefersReducedMotion()
  query().forEach((el, i) => {
    const from = before[i] ?? before[0]
    const to = el.getBoundingClientRect()
    if (from && !reduced) {
      el.animate(
        [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: 'none' }],
        { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' }
      )
      el.animate([{ translate: '0' }, { translate: '-3px' }, { translate: '3px' }, { translate: '-2px' }, { translate: '0' }], { duration: 260, delay: 240 })
    }
    el.animate([{ boxShadow: '0 0 0 2px var(--ui-error)' }, { boxShadow: '0 0 0 2px transparent' }], { duration: 900, delay: reduced ? 0 : 240 })
  })
}
defineExpose({ revert })
</script>

<template>
  <div
    ref="scrollerEl"
    class="relative max-h-[calc(100vh-17rem)] min-h-96 overflow-auto rounded-b-2xl select-none [-webkit-touch-callout:none]"
  >
    <div
      class="grid"
      :style="{ gridTemplateColumns: template }"
    >
      <!-- Header -->
      <div
        ref="headerEl"
        class="sticky top-0 left-0 z-30 border-b border-default bg-default"
      />
      <div
        v-for="column in columns"
        :key="`head-${column.key}`"
        class="sticky top-0 z-20 border-b border-l border-default bg-default px-2 py-2.5 text-center"
      >
        <p
          class="truncate text-xs font-semibold"
          :class="column.today ? 'text-primary' : 'text-highlighted'"
        >
          {{ column.title }}
        </p>
        <p
          v-if="column.subtitle"
          class="truncate text-[11px] text-muted"
        >
          {{ column.subtitle }}
        </p>
        <p
          v-if="column.closure"
          class="mt-1 truncate rounded bg-error/10 px-1.5 py-0.5 text-[10px] font-medium text-error"
          :title="column.closure"
        >
          Closed · {{ column.closure }}
        </p>
      </div>

      <!-- Hour labels -->
      <div
        class="sticky left-0 z-10 bg-default"
        :style="{ height: `${height}px` }"
      >
        <div
          v-for="hour in hours"
          :key="hour"
          class="relative text-right"
          :style="{ height: `${HOUR_HEIGHT}px` }"
        >
          <span class="absolute -top-2 right-2 text-[10px] text-muted tabular-nums">{{ hour === startHour ? '' : fromMinutes(hour * 60) }}</span>
        </div>
      </div>

      <!-- Day / specialist columns -->
      <div
        v-for="column in columns"
        :key="column.key"
        :ref="(el: unknown) => setColumnEl(column.key, el)"
        class="relative cursor-cell border-l border-default"
        :class="column.closure ? 'bg-error/5' : ''"
        :style="{ height: `${height}px` }"
        role="presentation"
        @pointerdown="onColumnDown($event, column)"
        @pointermove="onColumnHover($event, column)"
        @pointerleave="hover = null"
        @click="create($event, column)"
      >
        <div
          v-for="hour in hours"
          :key="hour"
          class="pointer-events-none border-t border-default/70 first:border-t-0"
          :style="{ height: `${HOUR_HEIGHT}px` }"
        >
          <div class="h-1/2 border-b border-dashed border-default/40" />
        </div>

        <!-- Outside working hours -->
        <template v-if="column.hours !== undefined">
          <div
            v-if="column.hours === null"
            class="calendar-off pointer-events-none absolute inset-0"
          />
          <template v-else>
            <div
              class="calendar-off pointer-events-none absolute inset-x-0 top-0"
              :style="{ height: `${y(column.hours.open)}px` }"
            />
            <div
              class="calendar-off pointer-events-none absolute inset-x-0 bottom-0"
              :style="{ top: `${y(column.hours.close)}px` }"
            />
          </template>
        </template>

        <!-- Hover hint -->
        <div
          v-if="hover && hover.column === column.key && !g"
          class="pointer-events-none absolute inset-x-[2px] z-[4] rounded-md border border-dashed border-default bg-elevated/40 px-1.5 py-0.5 text-[10px] text-muted"
          :style="{ top: `${y(hover.minutes)}px`, height: `${30 * perMinute}px` }"
        >
          + {{ fromMinutes(hover.minutes) }}
        </div>

        <!-- Blocks -->
        <button
          v-for="event in positioned.filter(item => item.column === column.key)"
          :key="event.key"
          type="button"
          :data-key="event.key"
          :data-group="event.group"
          class="group absolute flex touch-manipulation flex-col justify-start overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-[opacity,box-shadow] focus-visible:outline-2 focus-visible:outline-primary"
          :class="[
            event.tone,
            event.pending ? 'cursor-progress opacity-75' : event.editable ? 'cursor-grab hover:shadow-md' : 'cursor-pointer',
            event.muted ? 'opacity-55 line-through decoration-1' : '',
            event.dashed ? 'border-dashed' : '',
            isDimmed(event) ? 'pointer-events-none opacity-40 saturate-50 outline-1 outline-current/40 outline-dashed' : '',
            isResizing(event) ? 'z-[3] shadow-md ring-2 ring-primary' : 'z-[1] hover:z-[2]'
          ]"
          :style="{
            top: `${y(shown(event).start) + 1}px`,
            height: `${blockHeight(event)}px`,
            left: `calc(${(event.lane / event.lanes) * 100}% + 2px)`,
            width: `calc(${100 / event.lanes}% - 4px)`
          }"
          :aria-label="`${event.title}, ${event.subtitle}${event.editable ? '. Drag to move, Alt and arrow keys to move with the keyboard' : ''}`"
          @pointerdown.stop="onBlockDown($event, event)"
          @click.stop="emit('open', event)"
          @keydown="onBlockKey($event, event)"
        >
          <p
            v-if="blockHeight(event) < 38"
            class="truncate"
          >
            <span class="font-semibold">{{ event.title }}</span> <span class="opacity-80">{{ event.subtitle }}</span>
          </p>
          <template v-else>
            <p class="truncate font-semibold">
              {{ event.title }}
            </p>
            <p class="truncate opacity-80">
              {{ isResizing(event) ? formatRange(shown(event).start, shown(event).end) : event.subtitle }}
            </p>
          </template>
          <UIcon
            v-if="event.pending"
            name="i-lucide-loader-circle"
            class="absolute top-1 right-1 size-3 animate-spin"
          />
          <span
            v-if="event.editable && !event.pending && event.resizeStart && blockHeight(event) >= 26"
            class="absolute inset-x-0 top-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:h-3 [@media(hover:none)]:opacity-70"
            aria-hidden="true"
            @pointerdown.stop="onHandleDown($event, event, 'resize-start')"
          ><span class="mx-auto mt-0.5 block h-1 w-8 rounded-full bg-current/50" /></span>
          <span
            v-if="event.editable && !event.pending && event.resizeEnd"
            class="absolute inset-x-0 bottom-0 flex h-2 cursor-ns-resize items-end opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:h-3 [@media(hover:none)]:opacity-70"
            aria-hidden="true"
            @pointerdown.stop="onHandleDown($event, event, 'resize-end')"
          ><span class="mx-auto mb-0.5 block h-1 w-8 rounded-full bg-current/50" /></span>
        </button>

        <!-- Resize label -->
        <div
          v-if="resizeState && resizeState.event.column === column.key"
          class="pointer-events-none absolute left-1 z-[5] rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums shadow"
          :class="resizeState.invalid ? 'bg-error text-inverted' : 'bg-inverted text-inverted'"
          :style="resizeState.mode === 'resize-start'
            ? { top: `${Math.max(y(resizeState.start) - 24, 0)}px` }
            : { top: `${y(resizeState.end) + 4}px` }"
        >
          {{ resizeState.invalid ?? `${formatRange(resizeState.start, resizeState.end)} · ${formatDuration(resizeState.end - resizeState.start)}` }}
        </div>

        <!-- Drop indicator -->
        <div
          v-if="moveState && !moveState.outside && moveState.column === column.key"
          class="pointer-events-none absolute inset-x-[2px] z-[4] rounded-md border-2 border-dashed px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
          :class="moveState.invalid ? 'border-error bg-error/10 text-error' : 'border-primary bg-primary/10 text-primary'"
          :style="{ top: `${y(moveState.start)}px`, height: `${Math.max(y(moveState.end) - y(moveState.start), 18)}px` }"
        >
          {{ fromMinutes(moveState.start) }}
        </div>

        <!-- Range being selected / kept for the chooser -->
        <div
          v-if="g?.mode === 'select' && g.column === column.key"
          class="pointer-events-none absolute inset-x-[2px] z-[4] rounded-md border border-primary bg-primary/20 px-1.5 py-1 text-[11px] leading-tight shadow-sm"
          :style="{ top: `${y(g.start)}px`, height: `${y(g.end) - y(g.start)}px` }"
        >
          <p class="font-semibold text-primary tabular-nums">
            {{ formatRange(g.start, g.end) }}
          </p>
          <p
            v-if="y(g.end) - y(g.start) >= 36"
            class="text-muted"
          >
            {{ formatDuration(g.end - g.start) }}
          </p>
        </div>
        <div
          v-else-if="!g && highlight && highlight.column === column.key"
          class="pointer-events-none absolute inset-x-[2px] z-[4] rounded-md border border-primary bg-primary/20 px-1.5 py-1 text-[11px] font-semibold text-primary tabular-nums shadow-sm"
          :style="{ top: `${y(highlight.start)}px`, height: `${Math.max(y(highlight.end) - y(highlight.start), 18)}px` }"
        >
          {{ formatRange(highlight.start, highlight.end) }}
        </div>

        <!-- Now -->
        <div
          v-if="column.today && now.minutes >= gridStart && now.minutes <= gridEnd"
          class="pointer-events-none absolute inset-x-0 z-[6] border-t-2 border-error"
          :style="{ top: `${y(now.minutes)}px` }"
        >
          <span class="absolute -top-[5px] -left-[5px] size-2 rounded-full bg-error" />
        </div>
      </div>
    </div>

    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ announcement }}
    </p>

    <!-- The block itself follows the pointer while it is moved -->
    <Teleport to="body">
      <div
        v-if="moveState"
        ref="ghostEl"
        class="pointer-events-none fixed top-0 left-0 z-[60] flex flex-col overflow-visible rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight shadow-xl transition-[width,opacity] duration-100"
        :class="[moveState.event.tone, moveState.event.dashed ? 'border-dashed' : '', moveState.outside ? 'opacity-50' : 'opacity-95']"
        :style="{
          transform: `translate3d(${pointer.x - Math.min(moveState.grabDx, moveState.width - 8)}px, ${pointer.y - moveState.grabDy}px, 0)`,
          width: `${moveState.width}px`,
          height: `${moveState.height}px`
        }"
      >
        <span
          class="absolute -top-7 left-0 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums shadow"
          :class="moveState.invalid && !moveState.outside ? 'bg-error text-inverted' : 'bg-inverted text-inverted'"
        >{{ ghostLabel }}</span>
        <p class="truncate font-semibold">
          {{ moveState.event.title }}
        </p>
        <p class="truncate opacity-80 tabular-nums">
          {{ formatRange(moveState.start, moveState.end) }}
        </p>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.calendar-off {
  background-image: repeating-linear-gradient(135deg, rgb(148 163 184 / 0.12) 0 6px, transparent 6px 12px);
  background-color: rgb(148 163 184 / 0.08);
}
</style>
