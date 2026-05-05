<script setup lang="ts">
import type { AdminBooking } from '~/types/admin'
import { formatAdminDate, statusColors, statusLabels } from '~/utils/admin'

defineProps<{ bookings: AdminBooking[] }>()
defineEmits<{ edit: [booking: AdminBooking] }>()
const { serviceName, memberName } = useAdmin()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-sm">
      <caption class="sr-only">
        Appointments with client, service, specialist, date and status
      </caption>
      <thead class="border-y border-default bg-elevated/40 text-xs text-muted">
        <tr>
          <th
            scope="col"
            class="px-5 py-3.5 font-medium"
          >
            Client
          </th><th
            scope="col"
            class="px-5 py-3.5 font-medium"
          >
            Service / specialist
          </th><th
            scope="col"
            class="px-5 py-3.5 font-medium"
          >
            Date & time
          </th><th
            scope="col"
            class="px-5 py-3.5 font-medium"
          >
            Status
          </th><th
            scope="col"
            class="px-5 py-3.5"
          >
            <span class="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-default">
        <tr
          v-for="booking in bookings"
          :key="booking.id"
          class="transition-colors hover:bg-elevated/40"
        >
          <td class="px-5 py-4">
            <div class="flex items-center gap-3">
              <div class="hidden size-9 shrink-0 items-center justify-center rounded-full bg-primary/8 text-xs font-semibold text-primary sm:flex">
                {{ booking.firstName[0] }}{{ booking.lastName[0] }}
              </div><div>
                <button
                  class="cursor-pointer whitespace-nowrap text-left font-semibold text-highlighted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                  @click="$emit('edit', booking)"
                >
                  {{ booking.firstName }} {{ booking.lastName }}
                </button><p class="mt-0.5 text-xs text-muted">
                  #{{ booking.id }}
                </p>
              </div>
            </div>
          </td>
          <td class="px-5 py-4">
            <p class="whitespace-nowrap font-medium">
              {{ serviceName(booking.serviceId) }}
            </p><p class="mt-0.5 text-xs text-muted">
              {{ memberName(booking.userId) }}
            </p>
          </td>
          <td class="whitespace-nowrap px-5 py-4">
            <p>{{ formatAdminDate(booking.date, true) }}</p><p class="mt-0.5 text-xs text-muted">
              {{ booking.time }}
            </p>
          </td>
          <td class="px-5 py-4">
            <UBadge
              :color="statusColors[booking.status]"
              :label="statusLabels[booking.status]"
              variant="subtle"
              size="sm"
            />
          </td>
          <td class="px-5 py-4">
            <UButton
              icon="i-lucide-arrow-up-right"
              :aria-label="`Edit booking ${booking.id}`"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="$emit('edit', booking)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
