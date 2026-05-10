export type GesturePhase = 'idle' | 'pending' | 'active'
export type GestureCursor = 'grabbing' | 'resizing' | 'selecting'

export interface GestureOptions<P> {
  /** The press turned into a drag (mouse moved 4px, or a touch long-press). `down` is where the press started. */
  start: (payload: P, e: PointerEvent, down: { x: number, y: number }) => void
  /** Pointer moved, or the content scrolled under a still pointer (re-sent with the last event). */
  move: (e: PointerEvent) => void
  /** Released: commit. */
  end: (e: PointerEvent) => void
  /** Escape, pointercancel, window blur. */
  cancel: () => void
  cursor: (payload: P) => GestureCursor
  /** Scroll container that autoscrolls near its edges. */
  scroller?: () => HTMLElement | null
  /** Sticky parts inside the scroller (header row, hour column) the edge zones start after. */
  insets?: () => { top: number, left: number }
  /** Also scroll the page vertically near the viewport edges (month view). */
  scrollWindow?: boolean
}

const MOUSE_THRESHOLD = 4
const LONG_PRESS = 300
const TOUCH_TOLERANCE = 8
const EDGE_MOUSE = 40
const EDGE_TOUCH = 56
const MAX_SPEED = 16
/** Further than this outside the scroller, autoscroll stops (and the grids treat a release as cancel). */
export const OUTSIDE_DISTANCE = 64

const speed = (distance: number, zone: number) => distance < zone ? Math.ceil(MAX_SPEED * ((zone - Math.max(distance, 0)) / zone) ** 2) : 0

/**
 * Press → drag recognizer shared by the calendar grids: mouse/pen start after a small move, touch after a long-press
 * (so normal swipes keep scrolling). Handles Escape/cancel, cursor + no-text-selection classes on <html>,
 * autoscroll near the edges, and swallows the click that follows a drag.
 */
export function usePointerGesture<P>(options: GestureOptions<P>) {
  const phase = ref<GesturePhase>('idle')
  let payload: P | null = null
  let down = { x: 0, y: 0 }
  let pointerId = -1
  let pointerType = 'mouse'
  let last: PointerEvent | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let frame = 0
  let classes: string[] = []

  const blockTouch = (e: TouchEvent) => e.preventDefault()

  function setClasses(next: string[]) {
    document.documentElement.classList.remove(...classes)
    classes = next
    document.documentElement.classList.add(...classes)
  }

  /** Marks the pointer as "release will cancel" (no-drop cursor). */
  function setOutside(outside: boolean) {
    document.documentElement.classList.toggle('calendar-outside', outside)
  }

  function begin(e: PointerEvent, value: P) {
    if (phase.value !== 'idle' || !e.isPrimary) return
    if (e.pointerType !== 'touch' && e.button !== 0) return
    payload = value
    down = { x: e.clientX, y: e.clientY }
    pointerId = e.pointerId
    pointerType = e.pointerType
    last = e
    phase.value = 'pending'
    if (pointerType === 'touch') {
      timer = setTimeout(() => activate(last ?? e), LONG_PRESS)
    } else {
      // No text selection / native drag of the button's text
      e.preventDefault()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('blur', onBlur)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('contextmenu', onContextMenu, true)
  }

  function activate(e: PointerEvent) {
    if (phase.value !== 'pending' || payload === null) return
    clearTimeout(timer)
    phase.value = 'active'
    setClasses(['calendar-gesture', `calendar-${options.cursor(payload)}`])
    if (pointerType === 'touch') {
      window.addEventListener('touchmove', blockTouch, { passive: false })
      navigator.vibrate?.(12)
    }
    options.start(payload, e, down)
    options.move(e)
    frame = requestAnimationFrame(autoscroll)
  }

  function onMove(e: PointerEvent) {
    if (e.pointerId !== pointerId) return
    last = e
    const distance = Math.hypot(e.clientX - down.x, e.clientY - down.y)
    if (phase.value === 'pending') {
      if (pointerType === 'touch') {
        // Finger moved before the long-press fired: it is a scroll, not a drag
        if (distance > TOUCH_TOLERANCE) cleanup()
        return
      }
      if (e.buttons === 0) return cleanup()
      if (distance >= MOUSE_THRESHOLD) activate(e)
      return
    }
    if (phase.value === 'active') {
      // The button was released somewhere we did not hear about (e.g. outside the window)
      if (pointerType !== 'touch' && e.buttons === 0) return abort()
      options.move(e)
    }
  }

  function onUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return
    if (phase.value === 'active') {
      last = e
      options.end(e)
      finish()
    } else {
      // A plain click / tap: let the native click through
      cleanup()
    }
  }

  function onPointerCancel(e: PointerEvent) {
    if (e.pointerId !== pointerId) return
    if (phase.value === 'active') abort()
    else cleanup()
  }

  function onBlur() {
    if (phase.value === 'active') abort()
    else cleanup()
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    if (phase.value === 'active') {
      e.preventDefault()
      e.stopPropagation()
      abort()
    } else {
      cleanup()
    }
  }

  function onContextMenu(e: Event) {
    // Android long-press menu / right click while dragging
    e.preventDefault()
  }

  /** Cancel from outside (e.g. the data under the gesture went away). */
  function abort() {
    if (phase.value !== 'active') return cleanup()
    options.cancel()
    finish()
  }

  // The click that follows a drag must not open an editor or the chooser
  function swallowNextClick() {
    const swallow = (e: MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
    }
    window.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), pointerType === 'touch' ? 500 : 100)
  }

  function finish() {
    cleanup()
    swallowNextClick()
  }

  function autoscroll() {
    if (phase.value !== 'active' || !last) return
    const el = options.scroller?.()
    const e = last
    const zone = pointerType === 'touch' ? EDGE_TOUCH : EDGE_MOUSE
    let scrolled = false
    if (el) {
      const rect = el.getBoundingClientRect()
      const inset = options.insets?.() ?? { top: 0, left: 0 }
      const outside = e.clientX < rect.left - OUTSIDE_DISTANCE || e.clientX > rect.right + OUTSIDE_DISTANCE
        || e.clientY < rect.top - OUTSIDE_DISTANCE || e.clientY > rect.bottom + OUTSIDE_DISTANCE
      if (!outside) {
        const up = speed(e.clientY - (rect.top + inset.top), zone)
        const dy = up ? -up : speed(rect.bottom - e.clientY, zone)
        const left = speed(e.clientX - (rect.left + inset.left), zone)
        const dx = left ? -left : speed(rect.right - e.clientX, zone)
        const before = [el.scrollLeft, el.scrollTop]
        if (dx || dy) el.scrollBy(dx, dy)
        scrolled = el.scrollLeft !== before[0] || el.scrollTop !== before[1]
      }
    }
    if (options.scrollWindow) {
      const up = speed(e.clientY, zone)
      const dy = up ? -up : speed(window.innerHeight - e.clientY, zone)
      const before = window.scrollY
      if (dy) window.scrollBy(0, dy)
      scrolled ||= window.scrollY !== before
    }
    if (scrolled) options.move(e)
    frame = requestAnimationFrame(autoscroll)
  }

  function cleanup() {
    clearTimeout(timer)
    cancelAnimationFrame(frame)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('contextmenu', onContextMenu, true)
    window.removeEventListener('touchmove', blockTouch)
    if (import.meta.client) {
      setClasses([])
      setOutside(false)
    }
    phase.value = 'idle'
    payload = null
  }

  onBeforeUnmount(cleanup)

  return { phase: readonly(phase), begin, abort, setOutside }
}
