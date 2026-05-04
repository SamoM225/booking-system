<script setup lang="ts">
import type { AdminBooking } from '~/types/admin'
import { formatAdminDate, shiftDate } from '~/utils/admin'

definePageMeta({ layout: 'admin' })
const { data, memberName } = useAdminDemo()
const editorOpen = ref(false)
const selected = ref<AdminBooking | null>(null)
const selectedDate = ref(data.value.today)
const daily = computed(() => data.value.bookings.filter(item => item.date === selectedDate.value).sort((a, b) => a.time.localeCompare(b.time)))
const todayBookings = computed(() => data.value.bookings.filter(item => item.date === data.value.today && item.status !== 'cancelled'))
const pending = computed(() => data.value.bookings.filter(item => item.status === 'pending'))
const stats = computed(() => [
  { label: 'Appointments today', value: todayBookings.value.length, detail: 'Your day, at a glance', icon: 'i-lucide-calendar-check', color: 'bg-primary/10 text-primary' },
  { label: 'Awaiting confirmation', value: pending.value.length, detail: 'A little attention needed', icon: 'i-lucide-hourglass', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { label: 'Active specialists', value: data.value.members.filter(item => item.active).length, detail: 'People behind the care', icon: 'i-lucide-users-round', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  { label: 'Available services', value: data.value.services.filter(item => item.active).length, detail: 'Something for everyone', icon: 'i-lucide-sparkles', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' }
])
const week = computed(() => Array.from({ length: 7 }, (_, i) => {
  const date = shiftDate(data.value.today, i - 5)
  return { date, count: data.value.bookings.filter(item => item.date === date && item.status !== 'cancelled').length, label: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)) }
}))
const maxCount = computed(() => Math.max(1, ...week.value.map(day => day.count)))
function edit(booking: AdminBooking | null) {
  selected.value = booking
  editorOpen.value = true
}
</script>

<template>
  <div>
    <AdminPageHeading
      eyebrow="Your workspace, in balance"
      title="A good day starts here."
      description="A clear view of your appointments, your team and what comes next."
    >
      <UButton
        icon="i-lucide-plus"
        label="New booking"
        size="lg"
        class="rounded-xl"
        @click="edit(null)"
      />
    </AdminPageHeading>
    <div class="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-2xl border border-default bg-default p-5 shadow-sm shadow-slate-900/[0.02]"
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-muted">
            {{ stat.label }}
          </p><div
            class="flex size-9 items-center justify-center rounded-xl"
            :class="stat.color"
          >
            <UIcon
              :name="stat.icon"
              class="size-4.5"
            />
          </div>
        </div><p class="mt-3 text-3xl font-bold tracking-tight">
          {{ stat.value }}
        </p><p class="mt-2 text-xs text-muted">
          {{ stat.detail }}
        </p>
      </div>
    </div>
    <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
      <section class="min-w-0 overflow-hidden rounded-2xl border border-default bg-default">
        <div class="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 class="font-semibold text-highlighted">
              Your daily schedule
            </h2><p class="mt-1 text-xs text-muted">
              {{ formatAdminDate(selectedDate) }} · {{ daily.length }} appointments
            </p>
          </div><div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-chevron-left"
              aria-label="Previous day"
              variant="ghost"
              color="neutral"
              @click="selectedDate = shiftDate(selectedDate, -1)"
            /><UButton
              label="Today"
              variant="outline"
              color="neutral"
              size="sm"
              @click="selectedDate = data.today"
            /><UButton
              icon="i-lucide-chevron-right"
              aria-label="Next day"
              variant="ghost"
              color="neutral"
              @click="selectedDate = shiftDate(selectedDate, 1)"
            />
          </div>
        </div>
        <AdminBookingTable
          v-if="daily.length"
          :bookings="daily"
          @edit="edit"
        />
        <AdminEmptyState
          v-else
          title="A little breathing room"
          description="There are no appointments on this day."
        >
          <UButton
            label="Add a booking"
            variant="soft"
            @click="edit(null)"
          />
        </AdminEmptyState>
        <div class="flex justify-center border-t border-default p-3">
          <UButton
            to="/admin/bookings"
            label="View all bookings"
            trailing-icon="i-lucide-arrow-right"
            variant="link"
            size="sm"
          />
        </div>
      </section>
      <div class="space-y-6">
        <section class="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white shadow-lg shadow-primary/10">
          <div class="flex items-center justify-between">
            <span class="rounded-lg bg-white/15 p-2"><UIcon
              name="i-lucide-inbox"
              class="block size-5"
            /></span><span class="text-xs text-blue-100">Needs your attention</span>
          </div><h2 class="mt-5 text-xl font-semibold">
            {{ pending.length ? `${pending.length} bookings to review` : 'You’re all caught up' }}
          </h2><p class="mt-2 text-sm leading-6 text-blue-100">
            {{ pending.length ? 'A quick confirmation makes someone’s day a little easier.' : 'Everything is in place for your next appointment.' }}
          </p><UButton
            to="/admin/bookings?status=pending"
            label="Review bookings"
            trailing-icon="i-lucide-arrow-right"
            color="neutral"
            variant="solid"
            class="mt-5 bg-white text-blue-700 hover:bg-blue-50"
          />
        </section>
        <section class="rounded-2xl border border-default bg-default p-5">
          <h2 class="font-semibold">
            A week in view
          </h2><p class="mt-1 text-xs text-muted">
            Appointments · {{ formatAdminDate(week[0]!.date, true) }} – {{ formatAdminDate(week[6]!.date, true) }}
          </p><div
            class="mt-6 flex h-32 items-end gap-2"
            role="img"
            :aria-label="week.map(day => `${day.label}: ${day.count} appointments`).join(', ')"
          >
            <div
              v-for="day in week"
              :key="day.date"
              class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <span class="text-[10px] text-muted">{{ day.count }}</span><div
                class="w-full max-w-7 rounded-t-md"
                :class="day.date === data.today ? 'bg-primary' : 'bg-primary/20'"
                :style="{ height: `${Math.max(4, day.count / maxCount * 80)}px` }"
              /><span class="text-[10px] text-muted">{{ day.label }}</span>
            </div>
          </div>
        </section>
        <section class="rounded-2xl border border-default bg-default p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-semibold">
              Your team
            </h2><UButton
              to="/admin/team"
              icon="i-lucide-arrow-up-right"
              aria-label="Manage team"
              variant="ghost"
              color="neutral"
              size="xs"
            />
          </div><div
            v-for="member in data.members.filter(item => item.active)"
            :key="member.id"
            class="flex items-center gap-3 py-2"
          >
            <div class="flex size-9 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-600 dark:text-violet-400">
              {{ member.name.split(' ').map(part => part[0]).join('') }}
            </div><div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">
                {{ memberName(member.id) }}
              </p><p class="text-xs text-muted">
                {{ todayBookings.filter(item => item.userId === member.id).length }} appointments today
              </p>
            </div><span
              class="size-2 rounded-full bg-emerald-500"
              aria-label="Active"
            />
          </div>
        </section>
      </div>
    </div>
    <AdminBookingEditor
      v-model:open="editorOpen"
      :booking="selected"
    />
  </div>
</template>
