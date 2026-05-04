import type { CalendarProps } from '@nuxt/ui'


export const useBookingStore = defineStore('booking', () => {
  // --- static options (not reactive state, just data the UI renders) ---
  const categories = ['Haircut', 'Massage', 'Manicure']
  const workers = [
    { label: 'Alice', value: 'alice' },
    { label: 'Bob', value: 'bob' },
    { label: 'Charlie', value: 'charlie' }
  ]
  const times = ['09:00', '10:30', '14:00', '16:30']

  // --- state (the actual selection, shared everywhere) ---
  const category = ref('')
  const worker = ref('')
  const time = ref('')
  const date = shallowRef<CalendarProps['modelValue']>(undefined)

  // --- getters (derived values, cached & reactive) ---
  const workerLabel = computed(() => workers.find(w => w.value === worker.value)?.label ?? '')
  const isComplete = computed(() =>
    Boolean(category.value && worker.value && date.value && time.value)
  )

  // --- action (a method that changes state) ---
  function reset() {
    category.value = ''
    worker.value = ''
    time.value = ''
    date.value = undefined
  }

  return { categories, workers, times, category, worker, time, date, workerLabel, isComplete, reset }
})

// Keeps the store working after editing this file while `nuxt dev` is running
// (otherwise the hot-reloaded store goes stale and stops reacting until a full refresh).
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useBookingStore, import.meta.hot))
}
