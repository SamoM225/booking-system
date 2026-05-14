<script setup lang="ts">
import type { MonthItem } from '~/utils/calendar'
import { shiftDate } from '~/utils/admin'
import { datesBetween, dayOfMonth, daysBetween, formatDayShort, prefersReducedMotion, WEEKDAYS } from '~/utils/calendar'

const props = withDefaults(defineProps<{
  dates: string[]
  month: string
  today: string
  items: MonthItem[]
  closures: Record<string, string>
  /** Days kept highlighted while the editor for a selected range is open */
  highlight?: { from: string, to: string } | null
  /** Client-side check of a drop target; returns why it is not allowed */
  validate?: (draft: { item: MonthItem, date: string, days: number }) => string | null
}>(), { highlight: null, validate: undefined })

const emit = defineEmits<{
  create: [date: string]
  open: [item: MonthItem]
  day: [date: string]
  move: [change: { item: MonthItem, date: string, days: number }]
  /** Several days selected by dragging over empty cells */
  select: [range: { from: string, to: string }]
  invalid: [message: string]
}>()

const LIMIT = 3
const rootEl = ref<HTMLElement | null>(null)
const ghostEl = ref<HTMLElement | null>(null)

const byDate = computed(() => {
  const map: Record<string, MonthItem[]> = {}
  for (const item of props.items) (map[item.date] ??= []).push(item)
  // All-day first, then what continues from the day before, then by time; the key keeps equal times stable
  const rank = (item: MonthItem) => item.time === 'All day' ? '0' : item.time.startsWith('–') ? `1${item.time}` : `2${item.time}`
  for (const list of Object.values(map)) list.sort((a, b) => rank(a).localeCompare(rank(b)) || a.key.localeCompare(b.key))
  return map
})

// ---------- Gestures: move a chip to another day, drag over empty days to select a range ----------
type Payload = { kind: 'move', item: MonthItem, el: HTMLElement } | { kind: 'select', date: string }
interface MoveState {
  mode: 'move'
  item: MonthItem
  grabDx: number
  grabDy: number
  width: number
  height: number
  target: string | null
  days: number
  invalid: string | null
}
interface SelectState { mode: 'select', anchor: string, current: string, outside: boolean }

const g = ref<MoveState | SelectState | null>(null)
const pointer = reactive({ x: 0, y: 0 })

// Looks through everything under the pointer, so a toast covering a cell does not hide it as a drop target
function dateAt(x: number, y: number) {
  for (const el of document.elementsFromPoint(x, y)) {
    const cell = el.closest<HTMLElement>('[data-date]')
    if (cell && rootEl.value?.contains(cell)) return cell.dataset.date ?? null
  }
  return null
}

const gesture = usePointerGesture<Payload>({
  cursor: payload => payload.kind === 'move' ? 'grabbing' : 'selecting',
  scroller: () => rootEl.value,
  scrollWindow: true,
  start(payload, e, down) {
    ghostEl.value?.getAnimations().forEach(animation => animation.cancel())
    if (payload.kind === 'select') {
      g.value = { mode: 'select', anchor: payload.date, current: payload.date, outside: false }
      return
    }
    const rect = payload.el.getBoundingClientRect()
    g.value = {
      mode: 'move', item: payload.item, grabDx: down.x - rect.left, grabDy: down.y - rect.top,
      width: rect.width, height: rect.height, target: payload.item.date, days: 0, invalid: null
    }
  },
  move(e) {
    const state = g.value
    if (!state) return
    pointer.x = e.clientX
    pointer.y = e.clientY
    const date = dateAt(e.clientX, e.clientY)
    if (state.mode === 'select') {
      if (date) state.current = date
      state.outside = !date
      gesture.setOutside(!date)
      return
    }
    state.target = date
    gesture.setOutside(!date)
    state.days = date ? daysBetween(state.item.date, date) : 0
    state.invalid = date && state.days && props.validate ? props.validate({ item: state.item, date, days: state.days }) : null
  },
  end() {
    const state = g.value
    if (!state) return
    if (state.mode === 'select') {
      g.value = null
      // Released outside the month: nothing selected
      if (state.outside) return
      const [from, to] = [state.anchor, state.current].sort() as [string, string]
      if (from === to) emit('create', from)
      else emit('select', { from, to })
      return
    }
    if (!state.target || !state.days) return returnGhost(state)
    if (state.invalid) {
      emit('invalid', state.invalid)
      return returnGhost(state)
    }
    g.value = null
    emit('move', { item: state.item, date: state.target, days: state.days })
  },
  cancel() {
    const state = g.value
    if (state?.mode === 'move') returnGhost(state)
    else g.value = null
  }
})

function returnGhost(state: MoveState) {
  const ghost = ghostEl.value
  const origin = rootEl.value?.querySelector<HTMLElement>(`[data-key="${state.item.key}"]`)
  const done = () => {
    if (g.value === state) g.value = null
  }
  if (!ghost || !origin || prefersReducedMotion()) return done()
  const to = origin.getBoundingClientRect()
  ghost.animate(
    [{ transform: ghost.style.transform }, { transform: `translate3d(${to.left}px, ${to.top}px, 0)` }],
    { duration: 180, easing: 'ease-out', fill: 'forwards' }
  ).finished.then(done, done)
}

function onChipDown(e: PointerEvent, item: MonthItem) {
  if (!item.editable || item.pending) return
  gesture.begin(e, { kind: 'move', item, el: e.currentTarget as HTMLElement })
}

function onCellDown(e: PointerEvent, date: string) {
  gesture.begin(e, { kind: 'select', date })
}

const moveState = computed(() => g.value?.mode === 'move' ? g.value : null)
const selectRange = computed(() => {
  const state = g.value
  if (state?.mode !== 'select') return null
  const [from, to] = [state.anchor, state.current].sort() as [string, string]
  return { from, to }
})

// Days the dragged item would cover after the drop (its whole length for multi-day unavailability)
const covered = computed(() => {
  const state = moveState.value
  if (state?.target) {
    const span = state.item.span ?? { from: state.item.date, to: state.item.date }
    return new Set(datesBetween(shiftDate(span.from, state.days), shiftDate(span.to, state.days)))
  }
  const range = selectRange.value ?? (g.value ? null : props.highlight)
  return new Set(range ? datesBetween(range.from, range.to) : [])
})

function cellClass(date: string) {
  const state = moveState.value
  const invalid = Boolean(state?.invalid)
  return [
    date.slice(0, 7) === props.month ? '' : 'bg-elevated/40 text-muted',
    props.closures[date] ? 'bg-error/5' : '',
    covered.value.has(date) ? (invalid ? 'bg-error/10' : 'bg-primary/10') : '',
    state?.target === date || (selectRange.value && (date === selectRange.value.from || date === selectRange.value.to))
      ? `ring-2 ring-inset ${invalid ? 'ring-error' : 'ring-primary'}`
      : ''
  ]
}

const ghostLabel = computed(() => {
  const state = moveState.value
  if (!state) return ''
  if (!state.target) return 'Release to cancel'
  if (state.invalid) return state.invalid
  const span = state.item.span
  if (state.item.kind === 'timeOff' && span && span.from !== span.to) {
    return `${formatDayShort(shiftDate(span.from, state.days))} – ${formatDayShort(shiftDate(span.to, state.days))}`
  }
  return `${formatDayShort(state.target)} · ${state.item.time}`
})
// Labels flip to the left of the pointer on the right half of the screen, so they never run off it
const pastMiddle = computed(() => import.meta.client && pointer.x > window.innerWidth / 2)
const selectLabel = computed(() => {
  const range = selectRange.value
  if (!range) return ''
  const days = daysBetween(range.from, range.to) + 1
  return days === 1 ? formatDayShort(range.from) : `${formatDayShort(range.from)} – ${formatDayShort(range.to)} · ${days} days`
})

// ---------- Rejected by the server: slide the chips back, then shake ----------
async function revert(group: string, restore: () => void) {
  const query = () => [...(rootEl.value?.querySelectorAll<HTMLElement>(`[data-group="${group}"]`) ?? [])]
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
    ref="rootEl"
    class="overflow-x-auto select-none [-webkit-touch-callout:none]"
  >
    <div class="min-w-[720px]">
      <div class="grid grid-cols-7 border-b border-default">
        <div
          v-for="day in WEEKDAYS"
          :key="day"
          class="px-3 py-2.5 text-xs font-semibold text-muted capitalize"
        >
          {{ day.slice(0, 3) }}
        </div>
      </div>
      <div class="grid grid-cols-7">
        <div
          v-for="date in dates"
          :key="date"
          :data-date="date"
          class="group min-h-28 cursor-cell border-b border-l border-default p-1.5 transition-colors first:border-l-0 [&:nth-child(7n+1)]:border-l-0"
          :class="cellClass(date)"
          role="presentation"
          @pointerdown="onCellDown($event, date)"
          @click="emit('create', date)"
        >
          <div class="mb-1 flex items-center justify-between gap-1">
            <button
              type="button"
              class="flex size-6 items-center justify-center rounded-full text-xs font-semibold hover:bg-elevated"
              :class="date === today ? 'bg-primary text-inverted hover:bg-primary' : ''"
              :aria-label="`Open ${date} in day view`"
              @pointerdown.stop
              @click.stop="emit('day', date)"
            >
              {{ dayOfMonth(date) }}
            </button>
            <span
              v-if="closures[date]"
              class="truncate rounded bg-error/10 px-1.5 py-0.5 text-[10px] font-medium text-error"
              :title="closures[date]"
            >Closed</span>
          </div>
          <div class="space-y-0.5">
            <button
              v-for="item in (byDate[date] ?? []).slice(0, LIMIT)"
              :key="item.key"
              type="button"
              :data-key="item.key"
              :data-group="item.group"
              class="flex w-full touch-manipulation items-center gap-1.5 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-elevated"
              :class="[
                item.muted ? 'line-through opacity-55' : '',
                item.pending ? 'cursor-progress opacity-75' : item.editable ? 'cursor-grab' : 'cursor-pointer',
                moveState && moveState.item.group === item.group ? 'opacity-40' : ''
              ]"
              @pointerdown.stop="onChipDown($event, item)"
              @click.stop="!item.pending && emit('open', item)"
            >
              <span
                class="size-1.5 shrink-0 rounded-full"
                :class="item.dot"
              />
              <span class="text-muted tabular-nums">{{ item.time }}</span>
              <span class="truncate font-medium">{{ item.title }}</span>
              <UIcon
                v-if="item.pending"
                name="i-lucide-loader-circle"
                class="ml-auto size-3 shrink-0 animate-spin"
              />
            </button>
            <button
              v-if="(byDate[date]?.length ?? 0) > LIMIT"
              type="button"
              class="w-full rounded px-1 py-0.5 text-left text-[11px] font-medium text-primary hover:bg-primary/10"
              @pointerdown.stop
              @click.stop="emit('day', date)"
            >
              +{{ byDate[date]!.length - LIMIT }} more
            </button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <!-- Above toasts (z-[100]) -->
      <div
        v-if="moveState"
        ref="ghostEl"
        class="pointer-events-none fixed top-0 left-0 z-[200] text-[11px]"
        :style="{
          transform: `translate3d(${pointer.x - moveState.grabDx}px, ${pointer.y - moveState.grabDy}px, 0)`,
          width: `${moveState.width}px`,
          height: `${moveState.height}px`
        }"
      >
        <div
          class="flex size-full items-center gap-1.5 rounded-md bg-default px-1.5 py-1 shadow-lg ring-1 ring-default transition-opacity"
          :class="moveState.target ? 'opacity-95' : 'opacity-40'"
        >
          <span
            class="size-1.5 shrink-0 rounded-full"
            :class="moveState.item.dot"
          />
          <span class="text-muted tabular-nums">{{ moveState.item.time }}</span>
          <span class="truncate font-medium">{{ moveState.item.title }}</span>
        </div>
      </div>
      <div
        v-if="moveState"
        class="pointer-events-none fixed z-[200] rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums shadow"
        :class="[pastMiddle ? '-translate-x-full' : '', moveState.invalid ? 'bg-error text-inverted' : 'bg-inverted text-inverted']"
        :style="{ left: `${pastMiddle ? pointer.x - 12 : pointer.x + 12}px`, top: `${Math.max(pointer.y - moveState.grabDy - 28, 4)}px` }"
      >
        {{ ghostLabel }}
      </div>
      <div
        v-if="selectRange"
        class="pointer-events-none fixed top-0 left-0 z-[200] rounded-md bg-inverted px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-inverted tabular-nums shadow"
        :class="pastMiddle ? '-translate-x-full' : ''"
        :style="{ left: `${pastMiddle ? pointer.x - 12 : pointer.x + 12}px`, top: `${pointer.y - 30}px` }"
      >
        {{ g?.mode === 'select' && g.outside ? 'Release to cancel' : selectLabel }}
      </div>
    </Teleport>
  </div>
</template>
