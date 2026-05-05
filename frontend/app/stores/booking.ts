import type { CalendarProps } from '@nuxt/ui'

export interface PublicCategory { id: number, name: string }
export interface PublicService { id: number, categoryId: number, name: string, description: string | null, duration: number, price: number }

export const useBookingStore = defineStore('booking', () => {
  const api = useApi()

  // --- options loaded from the API ---
  const categories = ref<PublicCategory[]>([])
  const services = ref<PublicService[]>([])
  const workers = ref<{ label: string, value: string }[]>([])
  const times = ref<string[]>([])
  const loadingTimes = ref(false)

  // --- state (the actual selection, shared everywhere) ---
  const categoryId = ref(0)
  const serviceId = ref(0)
  const worker = ref('')
  const time = ref('')
  const date = shallowRef<CalendarProps['modelValue']>(undefined)

  // --- getters (derived values, cached & reactive) ---
  const categoryServices = computed(() => services.value.filter(item => item.categoryId === categoryId.value))
  const serviceLabel = computed(() => services.value.find(item => item.id === serviceId.value)?.name ?? '')
  const workerLabel = computed(() => workers.value.find(w => w.value === worker.value)?.label ?? '')
  const isComplete = computed(() =>
    Boolean(serviceId.value && worker.value && date.value && time.value)
  )

  // --- actions ---
  async function loadCatalog() {
    const [loadedCategories, loadedServices] = await Promise.all([
      api<PublicCategory[]>('/public/categories'),
      api<PublicService[]>('/public/services')
    ])
    categories.value = loadedCategories
    services.value = loadedServices
  }
  async function loadWorkers() {
    workers.value = (await api<{ id: string, name: string }[]>('/public/workers', { query: { serviceId: serviceId.value } }))
      .map(item => ({ label: item.name, value: item.id }))
  }
  async function loadTimes() {
    time.value = ''
    times.value = []
    if (!serviceId.value || !worker.value || !date.value) return
    loadingTimes.value = true
    try {
      times.value = await api<string[]>('/public/availability', {
        query: { userId: worker.value, serviceId: serviceId.value, date: date.value.toString() }
      })
    } finally {
      loadingTimes.value = false
    }
  }
  function reset() {
    categoryId.value = 0
    serviceId.value = 0
    worker.value = ''
    time.value = ''
    date.value = undefined
  }

  // Changing an earlier step invalidates the later ones
  watch(categoryId, () => {
    serviceId.value = 0
  })
  watch(serviceId, () => {
    worker.value = ''
    workers.value = []
    if (serviceId.value) loadWorkers()
  })
  watch([worker, date], loadTimes)

  return {
    categories, services, workers, times, loadingTimes, categoryId, serviceId, worker, time, date,
    categoryServices, serviceLabel, workerLabel, isComplete, loadCatalog, loadTimes, reset
  }
})

// Keeps the store working after editing this file while `nuxt dev` is running
// (otherwise the hot-reloaded store goes stale and stops reacting until a full refresh).
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useBookingStore, import.meta.hot))
}
