<script setup lang="ts">
import type { CalendarProps } from '@nuxt/ui'
import { getLocalTimeZone, today } from '@internationalized/date'

const store = useBookingStore()
// storeToRefs keeps state/getters reactive when destructured; plain data & actions come straight off the store.
const { categories, categoryId, categoryServices, serviceId, serviceLabel, workers, worker, times, loadingTimes, time, date, workerLabel, isComplete } = storeToRefs(store)

// Categories and services are loaded once at init (server-side), the user only picks from them
await callOnce('booking-catalog', () => store.loadCatalog().catch(() => {}))

const minDate = today(getLocalTimeZone()) as unknown as NonNullable<CalendarProps['minValue']>

const showService = computed(() => Boolean(categoryId.value))
const showWorker = computed(() => Boolean(serviceId.value))
const showDate = computed(() => Boolean(serviceId.value && worker.value))
const showTime = computed(() => Boolean(serviceId.value && worker.value && date.value))
const showPersonalDetails = computed(() => Boolean(serviceId.value && worker.value && date.value && time.value))
</script>

<template>
  <div class="w-full space-y-8">
    <fieldset>
      <legend class="mb-3 flex items-center gap-3 text-sm font-medium text-default">
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md shadow-primary/25">1</span>
        Category
      </legend>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="item in categories"
          :key="item.id"
          type="button"
          :aria-pressed="categoryId === item.id"
          class="min-w-32 flex-1 cursor-pointer rounded-2xl bg-default p-4 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-3 focus-visible:outline-primary/30"
          :class="categoryId === item.id ? 'bg-primary text-white shadow-primary/20' : 'text-default'"
          @click="categoryId = item.id"
        >
          {{ item.name }}
        </button>
      </div>
    </fieldset>

    <fieldset v-if="showService">
      <legend class="mb-3 flex items-center gap-3 text-sm font-medium text-default">
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md shadow-primary/25">2</span>
        Service
      </legend>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="item in categoryServices"
          :key="item.id"
          type="button"
          :aria-pressed="serviceId === item.id"
          class="min-w-40 flex-1 cursor-pointer rounded-2xl bg-default p-4 text-left text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-3 focus-visible:outline-primary/30"
          :class="serviceId === item.id ? 'bg-primary text-white shadow-primary/20' : 'text-default'"
          @click="serviceId = item.id"
        >
          <span class="block">{{ item.name }}</span>
          <span
            class="mt-1 block text-xs font-normal"
            :class="serviceId === item.id ? 'text-white/80' : 'text-muted'"
          >{{ item.duration }} min<template v-if="item.price"> · {{ item.price }} €</template></span>
        </button>
      </div>
    </fieldset>

    <fieldset
      v-if="showWorker"
    >
      <legend class="mb-3 flex items-center gap-3 text-sm font-medium text-default">
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md shadow-primary/25">3</span>
        Worker
      </legend>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="item in workers"
          :key="item.value"
          type="button"
          :aria-pressed="worker === item.value"
          class="min-w-32 flex-1 cursor-pointer rounded-2xl bg-default p-4 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-3 focus-visible:outline-primary/30"
          :class="worker === item.value ? 'bg-primary text-white shadow-primary/20' : 'text-default'"
          @click="worker = item.value"
        >
          {{ item.label }}
        </button>
      </div>
    </fieldset>

    <section
      v-if="showDate"
      class="space-y-3"
    >
      <h2 class="flex items-center gap-3 text-sm font-medium">
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md shadow-primary/25">4</span>
        Date & time
      </h2>

      <div class="flex flex-wrap items-start justify-start gap-8 rounded-2xl bg-default p-5 shadow-sm sm:p-6">
        <UCalendar
          v-model="date"
          :min-value="minDate"
        />

        <div class="flex flex-col gap-4">
          <h3 class="font-semibold text-highlighted">
            Select a time
          </h3>
          <p
            v-if="showTime && loadingTimes"
            class="text-sm text-muted"
          >
            Loading times…
          </p>
          <p
            v-else-if="showTime && !times.length"
            class="text-sm text-muted"
          >
            No free times on this day. Try another date or specialist.
          </p>
          <div
            v-else-if="showTime"
            class="grid grid-cols-2 gap-3"
          >
            <button
              v-for="item in times"
              :key="item"
              type="button"
              :aria-pressed="time === item"
              class="cursor-pointer rounded-xl bg-elevated px-5 py-3 text-sm font-medium shadow-sm transition-all hover:bg-primary/10 focus-visible:outline-3 focus-visible:outline-primary/30"
              :class="time === item ? 'bg-primary text-white shadow-primary/20' : 'text-default'"
              @click="time = item"
            >
              {{ item }}
            </button>
          </div>
        </div>
      </div>

      <p
        v-if="isComplete"
        class="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
      >
        Selected: {{ serviceLabel }} with {{ workerLabel }} on {{ date?.toString() }} at {{ time }}
      </p>
      <p
        v-else
        class="rounded-xl bg-default px-4 py-3 text-sm font-medium text-muted shadow-sm"
      >
        {{ !categoryId ? 'Pick a category to start.' : !serviceId ? 'Choose a service.' : !worker ? 'Now choose a worker.' : !date ? 'Select a date.' : 'Pick a time to finish.' }}
      </p>
    </section>
    <PersonalDetails v-if="showPersonalDetails" />
  </div>
</template>
