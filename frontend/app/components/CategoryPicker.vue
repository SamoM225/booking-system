<script setup lang="ts">
import type { CalendarProps } from '@nuxt/ui'
import { getLocalTimeZone, today } from '@internationalized/date'

const store = useBookingStore()
// storeToRefs keeps state/getters reactive when destructured; plain data & actions come straight off the store.
const { category, worker, time, date, workerLabel, isComplete } = storeToRefs(store)
const { categories, workers, times } = store

const minDate = today(getLocalTimeZone()) as unknown as NonNullable<CalendarProps['minValue']>

const showWorker = computed(() => Boolean(category.value))
const showDate = computed(() => Boolean(category.value && worker.value))
const showTime = computed(() => Boolean(category.value && worker.value && date.value))
const showPersonalDetails = computed(() => Boolean(category.value && worker.value && date.value && time.value))
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
          :key="item"
          type="button"
          :aria-pressed="category === item"
          class="min-w-32 flex-1 cursor-pointer rounded-2xl bg-default p-4 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-3 focus-visible:outline-primary/30"
          :class="category === item ? 'bg-primary text-white shadow-primary/20' : 'text-default'"
          @click="category = item"
        >
          {{ item }}
        </button>
      </div>
    </fieldset>

    <fieldset
      v-if="showWorker"
    >
      <legend class="mb-3 flex items-center gap-3 text-sm font-medium text-default">
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md shadow-primary/25">2</span>
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
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md shadow-primary/25">3</span>
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
          <div
            v-if="showTime"
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
        Selected: {{ category }} with {{ workerLabel }} on {{ date?.toString() }} at {{ time }}
      </p>
      <p
        v-else
        class="rounded-xl bg-default px-4 py-3 text-sm font-medium text-muted shadow-sm"
      >
        {{ !category ? 'Pick a category to start.' : !worker ? 'Now choose a worker.' : !date ? 'Select a date.' : 'Pick a time to finish.' }}
      </p>
    </section>
    <PersonalDetails v-if="showPersonalDetails" />
  </div>
</template>
