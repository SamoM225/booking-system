<script setup lang="ts">
const store = useBookingStore()
const { category, workerLabel, date, time, isComplete } = storeToRefs(store)

const summaryItems = computed(() => [
  { label: 'Service', value: category.value, icon: 'i-lucide-sparkles' },
  { label: 'Specialist', value: workerLabel.value, icon: 'i-lucide-user-round' },
  { label: 'Date', value: date.value?.toString(), icon: 'i-lucide-calendar-days' },
  { label: 'Time', value: time.value, icon: 'i-lucide-clock-3' }
])
</script>

<template>
  <div class="w-full">
    <div class="bg-gradient-to-br from-primary to-blue-600 p-6 text-white">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-white/75">
            Booking summary
          </p>
          <h2 class="mt-1 text-xl font-bold">
            Your appointment
          </h2>
        </div>
        <div class="flex size-11 items-center justify-center rounded-2xl bg-white/15">
          <UIcon
            name="i-lucide-calendar-check"
            class="size-6"
          />
        </div>
      </div>
    </div>

    <div class="space-y-3 p-6">
      <div
        v-for="item in summaryItems"
        :key="item.label"
        class="flex items-center gap-3 rounded-2xl bg-elevated/60 p-4"
      >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UIcon
            :name="item.icon"
            class="size-4"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-muted">
            {{ item.label }}
          </p>
          <p class="truncate text-sm font-semibold text-highlighted">
            {{ item.value || '—' }}
          </p>
        </div>
      </div>

      <UButton
        block
        size="lg"
        :disabled="!isComplete"
        trailing-icon="i-lucide-arrow-right"
        class="mt-5 justify-center"
        @click="store.reset()"
      >
        {{ isComplete ? 'Confirm booking' : 'Complete all steps' }}
      </UButton>

      <p class="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <UIcon
          name="i-lucide-shield-check"
          class="size-3.5 text-primary"
        />
        Your booking details are secure.
      </p>
    </div>
  </div>
</template>
