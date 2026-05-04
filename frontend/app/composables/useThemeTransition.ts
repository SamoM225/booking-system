const GROW_MS = 450
const FADE_MS = 200

// Background colours of both themes (Nuxt UI `--ui-bg`: white / neutral-900 with the slate palette).
const THEME_BG: Record<'light' | 'dark', string> = {
  light: '#ffffff',
  dark: '#0f172a'
}

/**
 * Dark/light toggle with a simple circular reveal growing from the clicked element.
 */
export function useThemeTransition() {
  const colorMode = useColorMode()
  const isAnimating = ref(false)

  function toggle(event?: MouseEvent) {
    if (import.meta.server || isAnimating.value) return

    const target = colorMode.value === 'dark' ? 'light' : 'dark'
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      colorMode.preference = target
      return
    }

    const rect = (event?.currentTarget as HTMLElement | null)?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    // radius that reaches the farthest viewport corner
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    isAnimating.value = true
    const overlay = document.createElement('div')
    overlay.setAttribute('aria-hidden', 'true')
    overlay.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:${THEME_BG[target]};clip-path:circle(0px at ${x}px ${y}px);`
    document.body.appendChild(overlay)

    const grow = overlay.animate(
      [
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${radius}px at ${x}px ${y}px)` }
      ],
      { duration: GROW_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
    )

    const finish = () => {
      overlay.remove()
      isAnimating.value = false
    }

    grow.onfinish = () => {
      colorMode.preference = target
      const fade = overlay.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: FADE_MS, easing: 'ease-out', fill: 'forwards' }
      )
      fade.onfinish = finish
      fade.oncancel = finish
    }
    grow.oncancel = () => {
      colorMode.preference = target
      finish()
    }
  }

  return { colorMode, isAnimating: readonly(isAnimating), toggle }
}
