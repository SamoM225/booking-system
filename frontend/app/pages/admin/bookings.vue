<script setup lang="ts">
import type { AdminBooking } from '~/types/admin'
import { statusLabels } from '~/utils/admin'

definePageMeta({ layout: 'admin' })
const route = useRoute()
const { data } = useAdminDemo()
const search = ref('')
const status = ref(typeof route.query.status === 'string' && route.query.status in statusLabels ? route.query.status : 'all')
const worker = ref('all')
const date = ref('')
const page = ref(1)
const editorOpen = ref(false)
const selected = ref<AdminBooking | null>(null)
const statuses = [{ label: 'All statuses', value: 'all' }, ...Object.entries(statusLabels).map(([value, label]) => ({ label, value }))]
const workers = computed(() => [{ label: 'All specialists', value: 'all' }, ...data.value.members.map(item => ({ label: item.name, value: item.id }))])
const filtered = computed(() => data.value.bookings.filter((item) => {
  const term = search.value.trim().toLowerCase()
  return (!term || `${item.firstName} ${item.lastName} ${item.email} ${item.id}`.toLowerCase().includes(term)) && (status.value === 'all' || item.status === status.value) && (worker.value === 'all' || item.userId === worker.value) && (!date.value || item.date === date.value)
}).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)))
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 8)))
const visible = computed(() => filtered.value.slice((page.value - 1) * 8, page.value * 8))
watch([search, status, worker, date], () => {
  page.value = 1
})
watch(pages, (value) => {
  page.value = Math.min(page.value, value)
})
watch(() => route.query.status, (value) => {
  status.value = typeof value === 'string' && value in statusLabels ? value : 'all'
})
function reset() {
  search.value = ''
  status.value = 'all'
  worker.value = 'all'
  date.value = ''
}
function edit(booking: AdminBooking | null) {
  selected.value = booking
  editorOpen.value = true
}
</script>

<template>
  <div>
    <AdminPageHeading
      eyebrow="Appointments"
      title="Every booking, in one place."
      description="Keep the day moving. Find, review and manage your appointments."
    >
      <UButton
        label="New booking"
        icon="i-lucide-plus"
        size="lg"
        class="rounded-xl"
        @click="edit(null)"
      />
    </AdminPageHeading>
    <section class="overflow-hidden rounded-2xl border border-default bg-default">
      <div class="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_160px_180px_160px_auto]">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search name, email or ID…"
          aria-label="Search bookings"
          class="w-full"
        />
        <USelect
          v-model="status"
          :items="statuses"
          aria-label="Filter by status"
          class="w-full"
        />
        <USelect
          v-model="worker"
          :items="workers"
          aria-label="Filter by specialist"
          class="w-full"
        />
        <UInput
          v-model="date"
          type="date"
          aria-label="Filter by date"
          class="w-full"
        />
        <UButton
          label="Reset"
          variant="ghost"
          color="neutral"
          @click="reset"
        />
      </div>
      <AdminBookingTable
        v-if="visible.length"
        :bookings="visible"
        @edit="edit"
      />
      <AdminEmptyState
        v-else
        title="No matching bookings"
        description="Try a different name, date or filter to find the appointment you need."
      >
        <UButton
          label="Clear filters"
          variant="soft"
          @click="reset"
        />
      </AdminEmptyState>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default px-5 py-4">
        <p
          class="text-xs text-muted"
          aria-live="polite"
        >
          {{ filtered.length ? `${(page - 1) * 8 + 1}–${Math.min(page * 8, filtered.length)} of ${filtered.length}` : '0' }} bookings
        </p><div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-chevron-left"
            aria-label="Previous page"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="page === 1"
            @click="page--"
          /><span class="text-xs text-muted">Page {{ page }} of {{ pages }}</span><UButton
            icon="i-lucide-chevron-right"
            aria-label="Next page"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="page >= pages"
            @click="page++"
          />
        </div>
      </div>
    </section>
    <AdminBookingEditor
      v-model:open="editorOpen"
      :booking="selected"
    />
  </div>
</template>
