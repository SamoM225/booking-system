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
  /** Directions the scroller may autoscroll for this gesture (a range selection stays in its column: 'y'). */
  axes?: (payload: P) => 'both' | 'y'
  /** Scroll container that autoscrolls near its edges. */
  scroller?: () => HTMLElement | null
  /** Sticky parts inside the scroller (header row, hour column) the edge zones start after. */
  insets?: () => { top: number, left: number }
  /** Scroll the page vertically near the viewport edges once the scroller cannot scroll further. */
  scrollWindow?: boolean
}

const MOUSE_THRESHOLD = 4
const LONG_PRESS = 300
const TOUCH_TOLERANCE = 8
/** Autoscroll only after the pointer really moved, so picking an item up next to an edge does not scroll away */
const AUTOSCROLL_ARM_DISTANCE = 12
/** On touch the finger has to rest in an edge zone for a moment before it scrolls */
const TOUCH_DWELL = 250
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
  let released = false
  // Each direction autoscrolls only after the pointer really moved that way
  let armedX = false
  let armedY = false
  let onlyY = false
  let activatedAt = { x: 0, y: 0 }
  let zoneSince = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let frame = 0
  let classes: string[] = []

  // iOS only lets a touchmove listener stop scrolling if it existed before the touch started, so it is always there
  // and only blocks while a touch drag is active. It sits on the grid (touches stay with the element they started on),
  // so scrolling the rest of the page is never held up by it.
  const blockTouch = (e: TouchEvent) => {
    if (phase.value === 'active' && pointerType === 'touch') e.preventDefault()
  }
  let touchRoot: HTMLElement | null = null
  onMounted(() => {
    touchRoot = options.scroller?.() ?? null
    touchRoot?.addEventListener('touchmove', blockTouch, { passive: false })
  })

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
    released = false
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
    armedX = false
    armedY = false
    onlyY = options.axes?.(payload) === 'y'
    activatedAt = { x: e.clientX, y: e.clientY }
    zoneSince = 0
    setClasses(['calendar-gesture', `calendar-${options.cursor(payload)}`])
    if (pointerType === 'touch') navigator.vibrate?.(12)
    options.scroller?.()?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
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
      if (pointerType !== 'touch' && e.buttons === 0) {
        released = true
        return abort()
      }
      if (Math.abs(e.clientX - activatedAt.x) > AUTOSCROLL_ARM_DISTANCE) armedX = true
      if (Math.abs(e.clientY - activatedAt.y) > AUTOSCROLL_ARM_DISTANCE) armedY = true
      options.move(e)
    }
  }

  // Wheel / trackpad scrolling during a drag: what is under the pointer changed
  function onScroll() {
    if (phase.value === 'active' && last) options.move(last)
  }

  function onUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return
    released = true
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
    released = true
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
      return
    }
    // Cancelled before it turned into a drag: the click of the later release must not open anything either
    const id = pointerId
    const touch = pointerType === 'touch'
    cleanup()
    if (!touch) swallowAfterRelease(id)
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

  // The click that follows a drag must not open an editor or the chooser. A touch drag makes no click of its own,
  // so the next press disarms it: its click belongs to that new tap.
  function swallowNextClick() {
    const swallow = (e: MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      disarm()
    }
    const disarm = () => {
      window.removeEventListener('click', swallow, true)
      window.removeEventListener('pointerdown', disarm, true)
    }
    window.addEventListener('click', swallow, true)
    window.addEventListener('pointerdown', disarm, true)
    setTimeout(disarm, pointerType === 'touch' ? 300 : 100)
  }

  function finish() {
    const id = pointerId
    const stillPressed = !released
    cleanup()
    if (!stillPressed) return swallowNextClick()
    swallowAfterRelease(id)
  }

  // Cancelled (Escape, blur) while the button is still held: the click comes with the real release, maybe much later
  function swallowAfterRelease(id: number) {
    const onLateUp = (e: PointerEvent) => {
      if (e.pointerId !== id) return
      stop()
      swallowNextClick()
    }
    // A new press means the old one was released somewhere we did not hear about
    const stop = () => {
      window.removeEventListener('pointerup', onLateUp, true)
      window.removeEventListener('pointerdown', stop, true)
    }
    window.addEventListener('pointerup', onLateUp, true)
    window.addEventListener('pointerdown', stop, true)
  }

  function autoscroll() {
    if (phase.value !== 'active' || !last) return
    frame = requestAnimationFrame(autoscroll)
    if (!armedX && !armedY) return
    const el = options.scroller?.()
    const e = last
    const zone = pointerType === 'touch' ? EDGE_TOUCH : EDGE_MOUSE
    let dx = 0
    let dy = 0
    if (el) {
      const rect = el.getBoundingClientRect()
      const inset = options.insets?.() ?? { top: 0, left: 0 }
      const outside = e.clientX < rect.left - OUTSIDE_DISTANCE || e.clientX > rect.right + OUTSIDE_DISTANCE
        || e.clientY < rect.top - OUTSIDE_DISTANCE || e.clientY > rect.bottom + OUTSIDE_DISTANCE
      if (!outside) {
        // Edges of the part of the scroller that is actually on screen
        const top = Math.max(rect.top + inset.top, 0)
        const bottom = Math.min(rect.bottom, window.innerHeight)
        const left = Math.max(rect.left + inset.left, 0)
        const right = Math.min(rect.right, window.innerWidth)
        const sideZone = Math.min(zone, (right - left) * 0.12)
        const up = speed(e.clientY - top, zone)
        dy = up ? -up : speed(bottom - e.clientY, zone)
        const back = speed(e.clientX - left, sideZone)
        dx = back ? -back : speed(right - e.clientX, sideZone)
      }
    } else if (options.scrollWindow) {
      const up = speed(e.clientY, zone)
      dy = up ? -up : speed(window.innerHeight - e.clientY, zone)
    }
    if (!armedX || onlyY) dx = 0
    if (!armedY) dy = 0
    if (!dx && !dy) {
      zoneSince = 0
      return
    }
    const now = performance.now()
    if (!zoneSince) zoneSince = now
    if (pointerType === 'touch' && now - zoneSince < TOUCH_DWELL) return

    let scrolled: boolean
    if (el) {
      const before = [el.scrollLeft, el.scrollTop]
      el.scrollBy(dx, dy)
      scrolled = el.scrollLeft !== before[0] || el.scrollTop !== before[1]
      // The grid is at its end, but part of it is still off screen in that direction: the page brings it into view
      const box = el.getBoundingClientRect()
      const clipped = dy > 0 ? box.bottom > window.innerHeight : box.top + (options.insets?.().top ?? 0) < 0
      if (options.scrollWindow && dy && el.scrollTop === before[1] && clipped) {
        const page = window.scrollY
        window.scrollBy(0, dy)
        scrolled ||= window.scrollY !== page
      }
    } else {
      const page = window.scrollY
      window.scrollBy(0, dy)
      scrolled = window.scrollY !== page
    }
    if (scrolled) options.move(e)
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
    window.removeEventListener('scroll', onScroll)
    options.scroller?.()?.removeEventListener('scroll', onScroll)
    if (import.meta.client) {
      setClasses([])
      setOutside(false)
    }
    phase.value = 'idle'
    payload = null
  }

  onBeforeUnmount(() => {
    cleanup()
    touchRoot?.removeEventListener('touchmove', blockTouch)
  })

  return { phase: readonly(phase), begin, abort, setOutside }
}
